import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';

import { CurrentUser } from '../../../core/auth/store/current-user.store';
import { exportPagePng } from './board-export';
import { handlePoint, isResizable, resizeTo, tableCellAt, topmostAt } from './board-geometry';
import { Board, BoardElement, BoardPage, BoardState } from './models/board.models';
import { toElement, toElementDto } from './models/board.mapper';
import { BoardService } from './services/board.service';
import { BoardStore } from './store/board.store';

class FakeBoardService extends BoardService {
  readonly isDemo = true;
  getBoard(roomId: string): Observable<Board> { return of({ roomId, pages: [] }); }
  createPage(_r: string, p: BoardPage): Observable<BoardPage> { return of(p); }
  updatePage(_r: string, p: BoardPage): Observable<BoardPage> { return of(p); }
  deletePage(): Observable<void> { return of(undefined); }
  saveElements(): Observable<void> { return of(undefined); }
  deleteElements(): Observable<void> { return of(undefined); }
  getState(): Observable<BoardState> { return of({ revision: 0, updatedAt: null }); }
}

const base = { color: '#000000', width: 4, authorId: 'u', createdAt: '2026-01-01T00:00:00Z' };
// PNG 1×1 rojo
const PIXEL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

const image: BoardElement = { ...base, id: 'i', type: 'image', x: 10, y: 10, w: 200, h: 100, src: PIXEL };
const table: BoardElement = { ...base, id: 't', type: 'table', x: 0, y: 0, w: 300, h: 150, rows: 3, cols: 3, cells: Array(9).fill('') };
const icon: BoardElement = { ...base, id: 'c', type: 'icon', x: 50, y: 50, size: 40, glyph: '⭐' };
const text: BoardElement = { ...base, id: 'x', type: 'text', x: 5, y: 5, text: 'Hola', size: 28 };

describe('board: imágenes, tablas e iconos', () => {
  it('resizes images keeping proportion, icons by size and tables freely', () => {
    expect(resizeTo(image, { x: 410, y: 999 })).toEqual(jasmine.objectContaining({ w: 400, h: 200 }));
    expect((resizeTo(icon, { x: 150, y: 0 }) as { size: number }).size).toBe(80);
    expect(resizeTo(table, { x: 400, y: 300 })).toEqual(jasmine.objectContaining({ w: 400, h: 300 }));
    expect(isResizable(text)).toBeFalse();
    expect(handlePoint(image)).toEqual({ x: 210, y: 110 });
  });

  it('finds the table cell under a point and selects tables/images/icons anywhere inside', () => {
    expect(tableCellAt(table, { x: 10, y: 10 })).toEqual({ row: 0, col: 0 });
    expect(tableCellAt(table, { x: 299, y: 149 })).toEqual({ row: 2, col: 2 });
    expect(tableCellAt(table, { x: 400, y: 10 })).toBeNull();
    expect(topmostAt([table, icon], { x: 60, y: 60 })?.id).toBe('c');
    expect(topmostAt([image], { x: 100, y: 50 })?.id).toBe('i');
  });

  it('keeps tables, icons and images through the proposed DTO', () => {
    [table, icon, image].forEach((el) => expect(toElement(toElementDto(el))).toEqual(el));
  });

  it('exports a PNG that contains the image, table and icon', async () => {
    const blob = await exportPagePng({ id: 'p', elements: [{ ...image, x: 100, y: 100, w: 50, h: 50 }, { ...table, x: 300, y: 300 }, icon] });
    expect(blob.type).toBe('image/png');
    const bmp = await createImageBitmap(blob);
    const ctx = Object.assign(document.createElement('canvas'), { width: bmp.width, height: bmp.height }).getContext('2d')!;
    ctx.drawImage(bmp, 0, 0);
    const px = ctx.getImageData(120, 120, 1, 1).data; // dentro de la imagen roja 1×1 escalada
    expect(px[0]).toBeGreaterThan(200);
    expect(px[1]).toBeLessThan(80);
    expect(Array.from(ctx.getImageData(300, 300, 1, 1).data.slice(0, 3)).every((v) => v < 100)).toBeTrue(); // esquina de la tabla
  });
});

describe('BoardStore.applyToSelected (tamaño, color y grosor del elemento seleccionado)', () => {
  let store: BoardStore;
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [BoardStore, { provide: BoardService, useValue: new FakeBoardService() }, { provide: CurrentUser, useValue: { profile: signal(null) } }]
    });
    store = TestBed.inject(BoardStore);
    await store.load('SR-1');
  });

  it('changes the size of a selected text as one undoable step', () => {
    store.addElement(text);
    store.selectedId.set('x');
    store.applyToSelected({ size: 56 });
    expect((store.selected() as { size: number }).size).toBe(56);
    store.undo();
    store.selectedId.set('x');
    expect((store.selected() as { size: number }).size).toBe(28);
  });

  it('ignores size on shapes and width on images', () => {
    store.addElement(image);
    store.selectedId.set('i');
    store.applyToSelected({ size: 99, width: 9, color: '#ff0000' });
    const sel = store.selected()!;
    expect(sel.width).toBe(4);
    expect(sel.color).toBe('#ff0000');
    expect('size' in sel).toBeFalse();
  });

  it('replaces table cells without touching the rest', () => {
    store.addElement(table);
    const t = store.elements()[0] as { cells: string[] } & BoardElement;
    store.replaceElement({ ...t, cells: ['A', ...t.cells.slice(1)] } as BoardElement);
    expect((store.elements()[0] as { cells: string[] }).cells[0]).toBe('A');
    expect(store.elements().length).toBe(1);
  });
});
