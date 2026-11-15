import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';

import { CurrentUser } from '../../../core/auth/store/current-user.store';
import { signal } from '@angular/core';
import { hitTest, topmostAt, translate } from './board-geometry';
import { exportPagePng, exportPdf } from './board-export';
import { BOARD_HEIGHT, BOARD_WIDTH, Board, BoardElement, BoardPage, BoardState } from './models/board.models';
import { BoardService } from './services/board.service';
import { BoardStore } from './store/board.store';
import { toElement, toElementDto } from './models/board.mapper';
import { buildPdf } from './pdf-writer';

class FakeBoardService extends BoardService {
  readonly isDemo = true;
  saved: BoardPage[] = [];
  getBoard(roomId: string): Observable<Board> { return of({ roomId, pages: [] }); }
  createPage(_r: string, p: BoardPage): Observable<BoardPage> { return of(p); }
  updatePage(_r: string, p: BoardPage): Observable<BoardPage> { this.saved.push(p); return of(p); }
  deletePage(): Observable<void> { return of(undefined); }
  saveElements(): Observable<void> { return of(undefined); }
  deleteElements(): Observable<void> { return of(undefined); }
  getState(): Observable<BoardState> { return of({ revision: 0, updatedAt: null }); }
}

const base = { color: '#000000', width: 4, authorId: 'u', createdAt: '2026-01-01T00:00:00Z' };
const pen = (id: string): BoardElement => ({ ...base, id, type: 'pen', points: [{ x: 10, y: 10 }, { x: 50, y: 10 }] });

describe('BoardStore', () => {
  let store: BoardStore;
  let api: FakeBoardService;

  beforeEach(async () => {
    api = new FakeBoardService();
    TestBed.configureTestingModule({
      providers: [BoardStore, { provide: BoardService, useValue: api }, { provide: CurrentUser, useValue: { profile: signal(null) } }]
    });
    store = TestBed.inject(BoardStore);
    await store.load('SR-1');
  });

  it('adds elements, undoes and redoes', () => {
    store.addElement(pen('a'));
    store.addElement(pen('b'));
    expect(store.elements().length).toBe(2);
    store.undo();
    expect(store.elements().map((e) => e.id)).toEqual(['a']);
    store.redo();
    expect(store.elements().length).toBe(2);
    store.undo();
    store.addElement(pen('c'));
    expect(store.canRedo()).toBeFalse();
  });

  it('groups a drag gesture into one history step', () => {
    store.addElement(pen('a'));
    store.beginGesture();
    store.updateLive([translate(store.elements()[0], 5, 5)]);
    store.updateLive([translate(store.elements()[0], 5, 5)]);
    store.endGesture();
    store.undo();
    expect((store.elements()[0] as { points: { x: number }[] }).points[0].x).toBe(10);
  });

  it('removes the selected element and clears the page (undoable)', () => {
    store.addElement(pen('a'));
    store.addElement(pen('b'));
    store.selectedId.set('a');
    store.removeSelected();
    expect(store.elements().map((e) => e.id)).toEqual(['b']);
    store.clearPage();
    expect(store.elements().length).toBe(0);
    store.undo();
    expect(store.elements().length).toBe(1);
  });

  it('manages pages with independent content and history', () => {
    store.addElement(pen('a'));
    store.addPage();
    expect(store.pages().length).toBe(2);
    expect(store.elements().length).toBe(0);
    store.addElement(pen('b'));
    store.goTo(0);
    expect(store.elements().map((e) => e.id)).toEqual(['a']);
    store.removePage(1);
    expect(store.pages().length).toBe(1);
    store.removePage(0);
    expect(store.pages().length).toBe(1);
  });

  it('clamps the zoom', () => {
    store.setZoom(10);
    expect(store.zoom()).toBe(3);
    store.setZoom(0.01);
    expect(store.zoom()).toBe(0.25);
    store.setZoom(1);
    store.zoomIn();
    expect(store.zoom()).toBe(1.25);
  });

  it('saves the page through the service after a change', (done) => {
    store.addElement(pen('a'));
    expect(store.persistence()).toBe('saving');
    setTimeout(() => {
      expect(api.saved.at(-1)?.elements.length).toBe(1);
      expect(store.persistence()).toBe('saved');
      done();
    }, 900);
  });

  it('emits an operation for every edit (hook for future WebSocket sync)', () => {
    const ops: string[] = [];
    store.operations$.subscribe((o) => ops.push(o.type));
    store.addElement(pen('a'));
    store.addPage();
    expect(ops).toEqual(['element.add', 'page.add']);
  });
});

describe('board geometry and mapping', () => {
  it('hit-tests strokes and picks the topmost element', () => {
    const line: BoardElement = { ...base, id: 'l', type: 'line', from: { x: 0, y: 0 }, to: { x: 100, y: 0 } };
    const rect: BoardElement = { ...base, id: 'r', type: 'rect', x: 0, y: 0, w: 100, h: 100 };
    expect(hitTest(line, { x: 50, y: 3 })).toBeTrue();
    expect(hitTest(line, { x: 50, y: 40 })).toBeFalse();
    expect(hitTest(rect, { x: 50, y: 50 })).toBeFalse(); // contorno, no relleno
    expect(topmostAt([rect, line], { x: 50, y: 1 })?.id).toBe('l');
  });

  it('round-trips elements through the proposed DTO', () => {
    const text: BoardElement = { ...base, id: 't', type: 'text', x: 3, y: 4, text: 'hola', size: 28 };
    const dto = toElementDto(text);
    expect(dto.authorUid).toBe('u');
    expect(dto.data).toEqual({ x: 3, y: 4, text: 'hola', size: 28 });
    expect(toElement(dto)).toEqual(text);
  });
});

describe('board export (browser, no backend)', () => {
  const page = (id: string): BoardPage => ({
    id,
    elements: [
      { ...base, id: 'r', type: 'rect', color: '#b93a27', x: 100, y: 100, w: 300, h: 200 },
      { ...base, id: 't', type: 'text', x: 120, y: 120, text: 'Hola', size: 40 }
    ]
  });

  it('exports a PNG with the board size and the drawn colors', async () => {
    const blob = await exportPagePng(page('1'));
    expect(blob.type).toBe('image/png');
    const bmp = await createImageBitmap(blob);
    expect([bmp.width, bmp.height]).toEqual([BOARD_WIDTH, BOARD_HEIGHT]);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bmp, 0, 0);
    expect(Array.from(ctx.getImageData(5, 5, 1, 1).data)).toEqual([255, 255, 255, 255]); // fondo blanco
    const edge = ctx.getImageData(100, 200, 1, 1).data; // borde izquierdo del rectángulo coral
    expect(edge[0]).toBeGreaterThan(150);
    expect(edge[1]).toBeLessThan(120);
  });

  it('exports one PDF page per board page', async () => {
    const blob = await exportPdf([page('1'), page('2'), page('3')]);
    expect(blob.type).toBe('application/pdf');
    const text = new TextDecoder('latin1').decode(new Uint8Array(await blob.arrayBuffer()));
    expect(text.startsWith('%PDF-1.4')).toBeTrue();
    expect(text).toContain('/Count 3');
    expect((text.match(/\/Subtype \/Image/g) ?? []).length).toBe(3);
  });
});

describe('PDF writer', () => {
  it('writes a valid xref table (every offset points at its object)', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    const bytes = buildPdf([{ jpeg, width: 1600, height: 1000 }, { jpeg, width: 1600, height: 1000 }]);
    const text = new TextDecoder('latin1').decode(bytes);
    const startxref = Number(/startxref\n(\d+)/.exec(text)![1]);
    expect(text.slice(startxref, startxref + 4)).toBe('xref');
    const entries = [...text.slice(startxref).matchAll(/(\d{10}) 00000 n /g)].map((m) => Number(m[1]));
    expect(entries.length).toBe(8);
    entries.forEach((off, i) => expect(text.slice(off, off + 8)).toBe(`${i + 1} 0 obj\n`.slice(0, 8)));
  });
});
