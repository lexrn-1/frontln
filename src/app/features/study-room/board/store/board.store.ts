import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject, firstValueFrom } from 'rxjs';

import { CurrentUser } from '../../../../core/auth/store/current-user.store';
import { AppError } from '../../../../core/http/app-error';
import { BOARD_COLORS, BoardElement, BoardOperation, BoardPage, BoardTool, PersistenceStatus } from '../models/board.models';
import { BoardService } from '../services/board.service';

const HISTORY_LIMIT = 100;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

interface History {
  undo: BoardElement[][];
  redo: BoardElement[][];
}

const newPage = (): BoardPage => ({ id: crypto.randomUUID(), elements: [] });

/**
 * Estado del tablero de una sala: páginas, herramienta, selección, zoom e historial por página
 * (deshacer/rehacer). Toda edición produce un `BoardOperation` en `operations$` (punto de enganche
 * para sincronizar por WebSocket cuando exista) y se guarda con `BoardService` solo si el backend
 * respondió al cargar; si no, el tablero funciona en local y lo indica en `persistence`.
 */
@Injectable()
export class BoardStore {
  private readonly api = inject(BoardService);
  private readonly user = inject(CurrentUser);

  readonly tool = signal<BoardTool>('pen');
  readonly color = signal<string>(BOARD_COLORS[0].value);
  readonly width = signal(4);
  readonly textSize = signal(28);
  readonly iconGlyph = signal<string>('⭐');
  readonly tableRows = signal(3);
  readonly tableCols = signal(3);
  readonly zoom = signal(1);

  readonly pages = signal<BoardPage[]>([newPage()]);
  readonly pageIndex = signal(0);
  readonly selectedId = signal<string | null>(null);
  readonly loadState = signal<'idle' | 'loading' | 'ready'>('idle');
  readonly persistence = signal<PersistenceStatus>('local');
  readonly persistenceMessage = signal<string | null>(null);
  readonly operations$ = new Subject<BoardOperation>();

  private roomId = '';
  private canPersist = false;
  private history = signal<Record<string, History>>({});
  private gestureStart: BoardElement[] | null = null;
  private dirty = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | undefined;

  readonly currentPage = computed(() => this.pages()[this.pageIndex()] ?? this.pages()[0]);
  readonly elements = computed(() => this.currentPage().elements);
  readonly selected = computed(() => this.elements().find((e) => e.id === this.selectedId()) ?? null);
  readonly canUndo = computed(() => (this.history()[this.currentPage().id]?.undo.length ?? 0) > 0);
  readonly canRedo = computed(() => (this.history()[this.currentPage().id]?.redo.length ?? 0) > 0);

  /** Carga el tablero guardado; si el backend no responde, edita en local sin perder nada. */
  async load(roomId: string): Promise<void> {
    this.roomId = roomId;
    this.loadState.set('loading');
    try {
      const board = await firstValueFrom(this.api.getBoard(roomId));
      this.pages.set(board.pages.length ? board.pages : [newPage()]);
      this.pageIndex.set(0);
      this.canPersist = true;
      this.persistence.set('saved');
      this.persistenceMessage.set(null);
      if (!board.pages.length) this.markDirty(this.pages()[0].id);
    } catch (error) {
      const e = AppError.from(error);
      this.canPersist = false;
      this.persistence.set('local');
      this.persistenceMessage.set(
        e.code === 'contract-pending'
          ? 'El guardado en el servidor aún no está disponible: el tablero vive solo en esta sesión.'
          : `No pudimos cargar el tablero guardado (${e.message}). Puedes dibujar; los cambios no se guardarán.`
      );
    }
    this.loadState.set('ready');
  }

  destroy(): void {
    clearTimeout(this.timer);
    if (this.dirty.size) void this.flush();
  }

  // --- Edición -------------------------------------------------------------------------------

  baseProps(): Pick<BoardElement, 'id' | 'color' | 'width' | 'authorId' | 'createdAt'> {
    return {
      id: crypto.randomUUID(), color: this.color(), width: this.width(),
      authorId: this.user.profile()?.uid ?? 'local', createdAt: new Date().toISOString()
    };
  }

  addElement(el: BoardElement): void {
    this.commit([...this.elements(), el], { type: 'element.add', pageId: this.currentPage().id, element: el });
  }

  /** Sustituye un elemento (editar texto, celda…) como un paso del historial. */
  replaceElement(el: BoardElement): void {
    this.commit(this.elements().map((e) => (e.id === el.id ? el : e)), { type: 'element.update', pageId: this.currentPage().id, element: el });
  }

  /** Aplica color, grosor o tamaño al elemento seleccionado (un paso del historial). */
  applyToSelected(patch: Partial<{ color: string; width: number; size: number }>): void {
    const sel = this.selected();
    if (!sel) return;
    const next = { ...sel } as BoardElement & { size?: number };
    if (patch.color !== undefined) next.color = patch.color;
    if (patch.width !== undefined && sel.type !== 'image') next.width = patch.width;
    if (patch.size !== undefined && (sel.type === 'text' || sel.type === 'icon')) next.size = patch.size;
    this.replaceElement(next);
  }

  removeElements(ids: string[]): void {
    const set = new Set(ids);
    const next = this.elements().filter((e) => !set.has(e.id));
    this.commit(next, { type: 'page.replace', pageId: this.currentPage().id, elements: next });
    if (this.selectedId() && set.has(this.selectedId()!)) this.selectedId.set(null);
  }

  removeSelected(): void {
    const id = this.selectedId();
    if (id) this.removeElements([id]);
  }

  clearPage(): void {
    this.commit([], { type: 'page.replace', pageId: this.currentPage().id, elements: [] });
    this.selectedId.set(null);
  }

  /** Inicia un gesto continuo (mover, borrar con el borrador): los cambios se agrupan en un solo paso del historial. */
  beginGesture(): void {
    this.gestureStart = this.elements();
  }

  updateLive(next: BoardElement[]): void {
    this.setElements(this.currentPage().id, next);
  }

  endGesture(): void {
    const start = this.gestureStart;
    this.gestureStart = null;
    if (!start || start === this.elements()) return;
    this.pushHistory(this.currentPage().id, start);
    this.touch({ type: 'page.replace', pageId: this.currentPage().id, elements: this.elements() });
  }

  undo(): void {
    const id = this.currentPage().id;
    const h = this.history()[id];
    if (!h?.undo.length) return;
    const previous = h.undo[h.undo.length - 1];
    this.history.update((all) => ({ ...all, [id]: { undo: h.undo.slice(0, -1), redo: [...h.redo, this.elements()] } }));
    this.setElements(id, previous);
    this.selectedId.set(null);
    this.touch({ type: 'page.replace', pageId: id, elements: previous });
  }

  redo(): void {
    const id = this.currentPage().id;
    const h = this.history()[id];
    if (!h?.redo.length) return;
    const next = h.redo[h.redo.length - 1];
    this.history.update((all) => ({ ...all, [id]: { undo: [...h.undo, this.elements()], redo: h.redo.slice(0, -1) } }));
    this.setElements(id, next);
    this.selectedId.set(null);
    this.touch({ type: 'page.replace', pageId: id, elements: next });
  }

  // --- Páginas y zoom --------------------------------------------------------------------------

  addPage(): void {
    const page = newPage();
    this.pages.update((p) => [...p, page]);
    this.pageIndex.set(this.pages().length - 1);
    this.selectedId.set(null);
    this.operations$.next({ type: 'page.add', pageId: page.id });
    if (this.canPersist) void this.persist(() => firstValueFrom(this.api.createPage(this.roomId, page)));
  }

  removePage(index = this.pageIndex()): void {
    if (this.pages().length <= 1) return;
    const page = this.pages()[index];
    this.pages.update((p) => p.filter((_, i) => i !== index));
    this.history.update(({ [page.id]: _gone, ...rest }) => rest);
    this.dirty.delete(page.id);
    this.pageIndex.set(Math.min(this.pageIndex(), this.pages().length - 1));
    this.selectedId.set(null);
    this.operations$.next({ type: 'page.remove', pageId: page.id });
    if (this.canPersist) void this.persist(() => firstValueFrom(this.api.deletePage(this.roomId, page.id)));
  }

  goTo(index: number): void {
    if (index < 0 || index >= this.pages().length) return;
    this.pageIndex.set(index);
    this.selectedId.set(null);
  }

  setZoom(value: number): void {
    this.zoom.set(Math.round(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)) * 100) / 100);
  }
  zoomIn(): void {
    this.setZoom(this.zoom() + 0.25);
  }
  zoomOut(): void {
    this.setZoom(this.zoom() - 0.25);
  }

  // --- Internos --------------------------------------------------------------------------------

  private commit(next: BoardElement[], op: BoardOperation): void {
    this.pushHistory(this.currentPage().id, this.elements());
    this.setElements(this.currentPage().id, next);
    this.touch(op);
  }

  private pushHistory(pageId: string, snapshot: BoardElement[]): void {
    this.history.update((all) => {
      const h = all[pageId] ?? { undo: [], redo: [] };
      return { ...all, [pageId]: { undo: [...h.undo, snapshot].slice(-HISTORY_LIMIT), redo: [] } };
    });
  }

  private setElements(pageId: string, elements: BoardElement[]): void {
    this.pages.update((pages) => pages.map((p) => (p.id === pageId ? { ...p, elements } : p)));
  }

  private touch(op: BoardOperation): void {
    this.operations$.next(op);
    this.markDirty(this.currentPage().id);
  }

  private markDirty(pageId: string): void {
    if (!this.canPersist) return;
    this.dirty.add(pageId);
    this.persistence.set('saving');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), 700);
  }

  private async flush(): Promise<void> {
    const ids = [...this.dirty];
    this.dirty.clear();
    await this.persist(async () => {
      for (const id of ids) {
        const page = this.pages().find((p) => p.id === id);
        if (page) await firstValueFrom(this.api.updatePage(this.roomId, page));
      }
    });
  }

  private async persist(op: () => Promise<unknown>): Promise<void> {
    try {
      await op();
      if (!this.dirty.size) this.persistence.set('saved');
    } catch (error) {
      this.persistence.set('error');
      this.persistenceMessage.set(`No se pudo guardar el tablero: ${AppError.from(error).message}`);
    }
  }
}
