import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, OnDestroy, afterNextRender, afterRender, computed, inject, input, output, signal, viewChild
} from '@angular/core';

import { Announcer } from '../../../../core/layout/announcer.service';
import { IconComponent } from '../../../../shared/ui/atoms/icon/icon.component';
import { ConfirmDialogComponent } from '../../../../shared/ui/molecules/confirm-dialog/confirm-dialog.component';
import { saveBlob } from '../../../../shared/utils/download';
import { handlePoint, hitTest, isResizable, rectFrom, resizeTo, tableCellAt, topmostAt, translate } from '../../board/board-geometry';
import { exportPagePng, exportPdf } from '../../board/board-export';
import { drawElement, drawSelection, loadImage, renderPage, setImageReadyListener } from '../../board/board-renderer';
import {
  BOARD_COLORS, BOARD_HEIGHT, BOARD_ICONS, BOARD_WIDTH, BoardElement, BoardTool, Point
} from '../../board/models/board.models';
import { BoardStore } from '../../board/store/board.store';

interface ToolDef { id: BoardTool; label: string; icon: string }
const TOOLS: ToolDef[] = [
  { id: 'select', label: 'Seleccionar y mover', icon: 'arrow_selector_tool' },
  { id: 'pen', label: 'Lápiz', icon: 'edit' },
  { id: 'eraser', label: 'Borrador', icon: 'ink_eraser' },
  { id: 'line', label: 'Línea', icon: 'horizontal_rule' },
  { id: 'arrow', label: 'Flecha', icon: 'arrow_right_alt' },
  { id: 'rect', label: 'Rectángulo', icon: 'crop_square' },
  { id: 'ellipse', label: 'Círculo', icon: 'radio_button_unchecked' },
  { id: 'text', label: 'Texto', icon: 'title' },
  { id: 'table', label: 'Tabla', icon: 'table_chart' },
  { id: 'icon', label: 'Icono', icon: 'emoji_emotions' }
];

const BASE_SIZES = [14, 18, 20, 24, 28, 32, 40, 56, 72];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Cuadro de edición flotante: texto nuevo, texto existente o celda de tabla. */
interface Editor {
  key: number;
  kind: 'new' | 'text' | 'cell';
  x: number;
  y: number;
  w?: number;
  size: number;
  color: string;
  initial: string;
  elId?: string;
  index?: number;
}

/**
 * Tablero interactivo que ocupa el escenario de la sala (como "presentar" en Meet): los participantes,
 * el chat y los controles siguen visibles. Dibuja en un canvas y delega estado, historial y guardado en `BoardStore`. La
 * exportación a PNG y PDF se hace íntegramente en el navegador. Los trazos NO se envían a otros
 * participantes (sincronización por WebSocket pendiente).
 */
@Component({
  selector: 'app-board-dialog',
  standalone: true,
  imports: [ConfirmDialogComponent, IconComponent],
  providers: [BoardStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section #dlg class="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl bg-surface-raised shadow-raised" aria-labelledby="board-title" (keydown)="onKey($event)">
      <div class="flex h-full min-h-0 flex-col">
        <header class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 sm:gap-3 sm:px-4 sm:py-3">
          <div class="flex items-center gap-3">
            <h2 id="board-title" class="text-base font-medium text-ink sm:text-lg">Tablero de estudio</h2>
            <p class="rounded-full bg-surface-raised px-3 py-1 text-xs font-semibold shadow-soft max-sm:hidden" [class]="store.persistence() === 'error' ? 'text-danger' : 'text-muted'" role="status">{{ persistenceLabel() }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button type="button" class="btn-ghost h-10 px-3 text-xs" aria-label="Descargar PNG de la página actual" [disabled]="exporting()" (click)="downloadPng()"><app-icon name="image" [size]="16" /> <span class="max-sm:sr-only">PNG (página actual)</span></button>
            <button type="button" class="btn-ghost h-10 px-3 text-xs" aria-label="Descargar PDF de la página actual" [disabled]="exporting()" (click)="downloadPdf(false)"><app-icon name="picture_as_pdf" [size]="16" /> <span class="max-sm:sr-only">PDF (página actual)</span></button>
            <button type="button" class="btn-ghost h-10 px-3 text-xs" aria-label="Descargar PDF de todas las páginas" [disabled]="exporting()" (click)="downloadPdf(true)"><app-icon name="picture_as_pdf" [size]="16" /> <span class="max-sm:sr-only">PDF (todas)</span><span class="sm:hidden" aria-hidden="true">todas</span></button>
            <button type="button" class="neu-chip h-10 w-10 bg-surface-raised text-ink" aria-label="Cerrar tablero y volver a la sala" (click)="requestClose()"><app-icon name="close" [size]="18" /></button>
          </div>
        </header>

        <p class="bg-warning-soft px-3 py-1 text-[11px] font-medium text-warning sm:px-4 sm:py-1.5 sm:text-xs" role="note">
          <span class="sm:hidden">Los demás aún no ven tus trazos.</span><span class="hidden sm:inline">Los demás participantes no ven tus trazos en tiempo real: la sincronización está pendiente de integración.</span>
          @if (store.persistenceMessage(); as msg) { {{ msg }} }
        </p>

        <div class="relative flex items-center gap-x-4 gap-y-2 overflow-x-auto border-b border-border px-3 py-2 sm:flex-wrap sm:overflow-visible sm:px-4 sm:py-2.5 [&>*]:shrink-0" role="toolbar" aria-label="Herramientas del tablero">
          <div class="flex gap-1.5" role="group" aria-label="Herramientas de dibujo">
            @for (t of tools; track t.id) {
              <button type="button" class="tool" [class.tool-on]="store.tool() === t.id" [attr.aria-pressed]="store.tool() === t.id" [attr.aria-label]="t.label" [title]="t.label" (click)="setTool(t.id)"><app-icon [name]="t.icon" [size]="20" /></button>
            }
          </div>
          <div class="flex gap-1.5" role="group" aria-label="Color">
            @for (c of colors; track c.value) {
              <button type="button" class="h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-canvas" [style.background]="c.value" [class]="activeColor() === c.value ? 'ring-ink' : 'ring-transparent'" [attr.aria-pressed]="activeColor() === c.value" [attr.aria-label]="c.label" (click)="setColor(c.value)"></button>
            }
          </div>
          <label class="flex items-center gap-2 text-xs font-medium text-ink">
            Grosor
            <input type="range" min="1" max="20" class="w-24 accent-primary" [value]="activeWidth()" (input)="setWidth(+$any($event.target).value)" [attr.aria-valuetext]="activeWidth() + ' píxeles'" />
            <span class="w-10 font-semibold">{{ activeWidth() }} px</span>
          </label>
          @if (showSize()) {
            <label class="flex items-center gap-2 text-xs font-medium text-ink">
              {{ store.selected()?.type === 'icon' || store.tool() === 'icon' ? 'Tamaño del icono' : 'Tamaño del texto' }}
              <select class="h-9 rounded-lg bg-surface-raised px-2 text-xs font-semibold shadow-soft" (change)="setSize(+$any($event.target).value)">
                @for (sz of sizeOptions(); track sz) { <option [value]="sz" [selected]="sz === sizeValue()">{{ sz }} px</option> }
              </select>
            </label>
          }
          @if (store.tool() === 'table') {
            <div class="flex items-center gap-3 text-xs font-medium text-ink" role="group" aria-label="Tamaño de la tabla">
              <label class="flex items-center gap-1.5">Filas <input type="number" min="1" max="12" class="input-control h-9 w-16 !px-2" [value]="store.tableRows()" (input)="setTable('rows', +$any($event.target).value)" /></label>
              <label class="flex items-center gap-1.5">Columnas <input type="number" min="1" max="8" class="input-control h-9 w-16 !px-2" [value]="store.tableCols()" (input)="setTable('cols', +$any($event.target).value)" /></label>
              <span class="text-muted">Arrastra sobre el lienzo para dibujarla</span>
            </div>
          }
          <div class="flex gap-1.5" role="group" aria-label="Acciones">
            <button type="button" class="tool" aria-label="Insertar imagen" title="Insertar imagen (también puedes pegarla con Ctrl+V)" (click)="imageInput.click()"><app-icon name="add_photo_alternate" [size]="20" /></button>
            <input #imageInput type="file" class="sr-only" tabindex="-1" aria-hidden="true" accept="image/png,image/jpeg,image/webp,image/gif" (change)="onImagePicked($event)" />
            <button type="button" class="tool" aria-label="Deshacer" title="Deshacer (Ctrl+Z)" [disabled]="!store.canUndo()" (click)="store.undo()"><app-icon name="undo" [size]="20" /></button>
            <button type="button" class="tool" aria-label="Rehacer" title="Rehacer (Ctrl+Y)" [disabled]="!store.canRedo()" (click)="store.redo()"><app-icon name="redo" [size]="20" /></button>
            <button type="button" class="tool" aria-label="Eliminar elemento seleccionado" title="Eliminar selección (Supr)" [disabled]="!store.selected()" (click)="store.removeSelected()"><app-icon name="delete" [size]="20" /></button>
            <button type="button" class="tool" aria-label="Limpiar tablero" title="Limpiar página" [disabled]="!store.elements().length" (click)="clearOpen.set(true)"><app-icon name="layers_clear" [size]="20" /></button>
          </div>
        </div>

        @if (store.tool() === 'icon') {
          <div class="flex flex-wrap items-center gap-1.5 border-b border-border px-4 py-2" role="group" aria-label="Iconos disponibles">
            @for (g of icons; track g) {
              <button type="button" class="tool text-xl" [class.tool-on]="store.iconGlyph() === g" [attr.aria-pressed]="store.iconGlyph() === g" [attr.aria-label]="'Icono ' + g" (click)="store.iconGlyph.set(g)">{{ g }}</button>
            }
            <span class="ml-2 text-xs text-muted">Haz clic en el lienzo para colocarlo</span>
          </div>
        }

        <div #viewport class="min-h-0 flex-1 overflow-auto bg-skeleton p-2 sm:p-4">
          <div class="relative mx-auto shadow-raised" [style.width.px]="cssWidth()" [style.height.px]="cssHeight()">
            <canvas
              #canvas
              class="block touch-none bg-white"
              [class]="store.tool() === 'select' ? 'cursor-default' : store.tool() === 'text' ? 'cursor-text' : 'cursor-crosshair'"
              role="img"
              [attr.aria-label]="'Lienzo de la página ' + (store.pageIndex() + 1) + ' con ' + store.elements().length + ' elementos. El dibujo requiere ratón o pantalla táctil.'"
              (pointerdown)="onDown($event)"
              (pointermove)="onMove($event)"
              (pointerup)="onUp($event)"
              (pointercancel)="onUp($event)"
              (dblclick)="onDouble($event)"
            ></canvas>
            @for (e of editors(); track e.key) {
              <input
                #textInput
                class="absolute rounded border border-primary bg-white px-1 text-ink outline-none"
                [style.left.px]="e.x * store.zoom()" [style.top.px]="e.y * store.zoom()"
                [style.width.px]="e.w ? e.w * store.zoom() : null" [style.min-width.px]="e.w ? null : 140"
                [style.font-size.px]="e.size * store.zoom()" [style.color]="e.color" [value]="e.initial"
                aria-label="Texto del tablero (Enter para confirmar, Esc para cancelar)"
                (keydown.enter)="commitEditor()" (keydown.escape)="cancelEditor($event)" (blur)="commitEditor()"
              />
            }
          </div>
        </div>

        <footer class="relative flex items-center justify-between gap-2 overflow-x-auto border-t border-border px-3 py-2 sm:flex-wrap sm:gap-3 sm:overflow-visible sm:px-4 sm:py-2.5 [&>*]:shrink-0">
          <div class="flex items-center gap-2" role="group" aria-label="Páginas">
            <button type="button" class="tool" aria-label="Página anterior" [disabled]="store.pageIndex() === 0" (click)="store.goTo(store.pageIndex() - 1)"><app-icon name="chevron_left" [size]="20" /></button>
            <span class="text-xs font-semibold text-ink" aria-live="polite">{{ store.pageIndex() + 1 }}/{{ store.pages().length }}<span class="sr-only"> páginas</span></span>
            <button type="button" class="tool" aria-label="Página siguiente" [disabled]="store.pageIndex() === store.pages().length - 1" (click)="store.goTo(store.pageIndex() + 1)"><app-icon name="chevron_right" [size]="20" /></button>
            <button type="button" class="btn-ghost h-10 px-3 text-xs" (click)="store.addPage()"><app-icon name="add" [size]="16" /> <span class="max-sm:sr-only">Nueva página</span></button>
            <button type="button" class="btn-ghost h-10 px-3 text-xs" [disabled]="store.pages().length <= 1" (click)="deleteOpen.set(true)"><app-icon name="delete" [size]="16" /> <span class="max-sm:sr-only">Eliminar página</span></button>
          </div>
          <div class="flex items-center gap-2" role="group" aria-label="Zoom">
            <button type="button" class="tool" aria-label="Alejar" (click)="store.zoomOut()"><app-icon name="zoom_out" [size]="20" /></button>
            <span class="w-12 text-center text-xs font-semibold text-ink" aria-live="polite">{{ zoomPercent() }}%</span>
            <button type="button" class="tool" aria-label="Acercar" (click)="store.zoomIn()"><app-icon name="zoom_in" [size]="20" /></button>
            <button type="button" class="btn-ghost h-10 px-3 text-xs" (click)="fit()"><span class="max-sm:hidden">Ajustar a pantalla</span><span class="sm:hidden">Ajustar</span></button>
          </div>
        </footer>
      </div>

      <app-confirm-dialog [open]="clearOpen()" heading="Limpiar página" message="Se borrarán todos los elementos de esta página. Podrás deshacerlo con «Deshacer» mientras no cierres el tablero." confirmLabel="Limpiar" (confirmed)="confirmClear()" (closed)="clearOpen.set(false)" />
      <app-confirm-dialog [open]="deleteOpen()" heading="Eliminar página" message="Se eliminará esta página y su contenido." confirmLabel="Eliminar página" (confirmed)="confirmDelete()" (closed)="deleteOpen.set(false)" />
    </section>
  `,
  styles: `
    .tool { display: grid; place-items: center; height: 2.5rem; width: 2.5rem; border-radius: 0.75rem; background: var(--color-surface-raised); box-shadow: var(--shadow-soft); color: var(--color-ink); }
    .tool:disabled { opacity: 0.45; cursor: not-allowed; }
    .tool:not(:disabled):active { box-shadow: var(--shadow-pressed); }
    .tool-on { color: var(--color-primary); box-shadow: var(--shadow-pressed); outline: 1.5px solid var(--color-primary); outline-offset: -1.5px; }
  `,
  host: { class: 'block h-full min-h-0 min-w-0' }
})
export class BoardDialogComponent implements OnDestroy {
  readonly roomId = input.required<string>();
  readonly closed = output<void>();

  protected readonly store = inject(BoardStore);
  private readonly announcer = inject(Announcer);
  protected readonly tools = TOOLS;
  protected readonly colors = BOARD_COLORS;
  protected readonly icons = BOARD_ICONS;
  protected readonly clearOpen = signal(false);
  protected readonly deleteOpen = signal(false);
  protected readonly exporting = signal(false);
  protected readonly editor = signal<Editor | null>(null);
  protected readonly editors = computed(() => {
    const e = this.editor();
    return e ? [e] : [];
  });
  private editorKey = 0;

  // Valores que muestra la barra: los del elemento seleccionado o los de la herramienta.
  protected readonly activeColor = computed(() => this.store.selected()?.color ?? this.store.color());
  protected readonly activeWidth = computed(() => {
    const s = this.store.selected();
    return s && s.type !== 'image' && s.type !== 'text' && s.type !== 'icon' ? s.width : this.store.width();
  });
  protected readonly sizeValue = computed(() => {
    const s = this.store.selected();
    return s && (s.type === 'text' || s.type === 'icon') ? s.size : this.store.textSize();
  });
  protected readonly showSize = computed(() => {
    const s = this.store.selected();
    return this.store.tool() === 'text' || this.store.tool() === 'icon' || (!!s && (s.type === 'text' || s.type === 'icon'));
  });
  protected readonly sizeOptions = computed(() => {
    const v = this.sizeValue();
    return BASE_SIZES.includes(v) ? BASE_SIZES : [...BASE_SIZES, v].sort((a, b) => a - b);
  });

  protected readonly cssWidth = computed(() => Math.round(BOARD_WIDTH * this.store.zoom()));
  protected readonly cssHeight = computed(() => Math.round(BOARD_HEIGHT * this.store.zoom()));
  protected readonly zoomPercent = computed(() => Math.round(this.store.zoom() * 100));
  protected readonly persistenceLabel = computed(() => {
    switch (this.store.persistence()) {
      case 'saving': return 'Guardando…';
      case 'saved': return 'Guardado';
      case 'error': return 'Error al guardar';
      default: return 'Solo en esta sesión';
    }
  });

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  private readonly textInput = viewChild<ElementRef<HTMLInputElement>>('textInput');

  private draft: BoardElement | null = null;
  private origin: Point | null = null;
  private erasing = false;
  private drag: { id: string; last: Point } | null = null;
  private resizing: string | null = null;

  constructor() {
    // El tablero se monta al abrirlo: carga lo guardado (si hay servidor) y ajusta el zoom.
    afterNextRender(() => void this.store.load(this.roomId()).then(() => setTimeout(() => this.fit())));
    afterRender(() => this.draw());
    setImageReadyListener(() => this.draw());
  }

  ngOnDestroy(): void {
    setImageReadyListener(null);
    this.store.destroy();
  }

  // --- Dibujo --------------------------------------------------------------------------------

  private draw(): void {
    const canvas = this.canvas().nativeElement;
    const zoom = this.store.zoom();
    const w = Math.round(BOARD_WIDTH * zoom), h = Math.round(BOARD_HEIGHT * zoom);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(zoom, 0, 0, zoom, 0, 0);
    renderPage(ctx, this.store.elements());
    if (this.draft) drawElement(ctx, this.draft);
    const selected = this.store.selected();
    if (selected) drawSelection(ctx, selected, zoom);
  }

  private pos(e: MouseEvent): Point {
    const rect = this.canvas().nativeElement.getBoundingClientRect();
    const z = this.store.zoom();
    return { x: (e.clientX - rect.left) / z, y: (e.clientY - rect.top) / z };
  }

  protected onDown(e: PointerEvent): void {
    if (e.button !== 0 || this.store.loadState() === 'loading') return;
    this.commitEditor();
    const p = this.pos(e);
    const tool = this.store.tool();
    this.canvas().nativeElement.setPointerCapture(e.pointerId);
    const base = this.store.baseProps();
    switch (tool) {
      case 'pen': this.draft = { ...base, type: 'pen', points: [p] }; break;
      case 'line': case 'arrow': this.draft = { ...base, type: tool, from: p, to: p }; break;
      case 'table': {
        const rows = this.store.tableRows(), cols = this.store.tableCols();
        this.origin = p;
        this.draft = { ...base, type: 'table', x: p.x, y: p.y, w: 0, h: 0, rows, cols, cells: Array(rows * cols).fill('') };
        break;
      }
      case 'icon': {
        const size = this.store.textSize();
        const el: BoardElement = { ...base, type: 'icon', x: p.x - size / 2, y: p.y - size / 2, size, glyph: this.store.iconGlyph() };
        this.store.addElement(el);
        break;
      }
      case 'rect': case 'ellipse': this.origin = p; this.draft = { ...base, type: tool, x: p.x, y: p.y, w: 0, h: 0 }; break;
      case 'eraser': this.store.beginGesture(); this.erasing = true; this.erase(p); break;
      case 'select': {
        const sel = this.store.selected();
        if (sel && isResizable(sel)) {
          const h = handlePoint(sel);
          const pad = 6 / this.store.zoom();
          if (Math.hypot(p.x - (h.x + pad), p.y - (h.y + pad)) < 14 / this.store.zoom()) {
            this.store.beginGesture();
            this.resizing = sel.id;
            break;
          }
        }
        const hit = topmostAt(this.store.elements(), p);
        this.store.selectedId.set(hit?.id ?? null);
        if (hit) { this.store.beginGesture(); this.drag = { id: hit.id, last: p }; }
        break;
      }
      case 'text':
        this.openEditor({ kind: 'new', x: p.x, y: p.y, size: this.store.textSize(), color: this.store.color(), initial: '' });
        e.preventDefault();
        break;
    }
    this.draw();
  }

  protected onMove(e: PointerEvent): void {
    const p = this.pos(e);
    const d = this.draft;
    if (d) {
      if (d.type === 'pen') d.points.push(p);
      else if (d.type === 'line' || d.type === 'arrow') d.to = p;
      else if ((d.type === 'rect' || d.type === 'ellipse' || d.type === 'table') && this.origin) Object.assign(d, rectFrom(this.origin, p));
    } else if (this.erasing) {
      this.erase(p);
    } else if (this.resizing) {
      const id = this.resizing;
      this.store.updateLive(this.store.elements().map((el) => (el.id === id ? resizeTo(el, p) : el)));
    } else if (this.drag) {
      const { id, last } = this.drag;
      const dx = p.x - last.x, dy = p.y - last.y;
      this.store.updateLive(this.store.elements().map((el) => (el.id === id ? translate(el, dx, dy) : el)));
      this.drag.last = p;
    } else {
      return;
    }
    this.draw();
  }

  protected onUp(_e: PointerEvent): void {
    const d = this.draft;
    if (d && this.isWorthKeeping(d)) {
      this.store.addElement(d);
      this.store.selectedId.set(null);
    }
    this.draft = null;
    this.origin = null;
    if (this.erasing || this.drag || this.resizing) this.store.endGesture();
    this.erasing = false;
    this.drag = null;
    this.resizing = null;
    this.draw();
  }

  private isWorthKeeping(d: BoardElement): boolean {
    if (d.type === 'table') return d.w > 40 && d.h > 24;
    if (d.type === 'rect' || d.type === 'ellipse') return d.w > 3 && d.h > 3;
    if (d.type === 'line' || d.type === 'arrow') return Math.hypot(d.to.x - d.from.x, d.to.y - d.from.y) > 3;
    return true;
  }

  private erase(p: Point): void {
    const keep = this.store.elements().filter((el) => !hitTest(el, p, 8));
    if (keep.length !== this.store.elements().length) this.store.updateLive(keep);
  }

  // --- Texto, celdas y propiedades ------------------------------------------------------------

  private openEditor(ed: Omit<Editor, 'key'>): void {
    this.editor.set({ ...ed, key: ++this.editorKey });
    setTimeout(() => {
      const input = this.textInput()?.nativeElement;
      input?.focus();
      input?.select();
    });
  }

  /**
   * Confirma lo escrito. El editor se cierra ANTES de leer el valor y cada edición es un cuadro
   * nuevo (`key`), así un blur tardío o un clic en otro lado nunca vuelve a pegar el mismo texto.
   */
  protected commitEditor(): void {
    const ed = this.editor();
    if (!ed) return;
    const text = (this.textInput()?.nativeElement.value ?? '').trim();
    this.editor.set(null);
    if (ed.kind === 'new') {
      if (text) this.store.addElement({ ...this.store.baseProps(), type: 'text', x: ed.x, y: ed.y, text, size: ed.size });
    } else {
      const el = this.store.elements().find((e) => e.id === ed.elId);
      if (el?.type === 'text') {
        if (text) this.store.replaceElement({ ...el, text });
        else this.store.removeElements([el.id]);
      } else if (el?.type === 'table' && ed.index !== undefined) {
        const cells = [...el.cells];
        cells[ed.index] = text;
        this.store.replaceElement({ ...el, cells });
      }
    }
    this.draw();
  }

  protected cancelEditor(e: Event): void {
    e.stopPropagation();
    this.editor.set(null);
  }

  /** Doble clic con "Seleccionar": edita el texto o la celda de la tabla bajo el puntero. */
  protected onDouble(e: MouseEvent): void {
    if (this.store.tool() !== 'select') return;
    const p = this.pos(e);
    const hit = topmostAt(this.store.elements(), p);
    if (hit?.type === 'text') {
      this.openEditor({ kind: 'text', x: hit.x, y: hit.y, size: hit.size, color: hit.color, initial: hit.text, elId: hit.id });
    } else if (hit?.type === 'table') {
      const cell = tableCellAt(hit, p);
      if (!cell) return;
      const cw = hit.w / hit.cols, ch = hit.h / hit.rows;
      this.openEditor({
        kind: 'cell', x: hit.x + cell.col * cw, y: hit.y + cell.row * ch, w: cw, size: Math.max(10, Math.min(24, ch * 0.45)),
        color: hit.color, initial: hit.cells[cell.row * hit.cols + cell.col] ?? '', elId: hit.id, index: cell.row * hit.cols + cell.col
      });
    }
  }

  protected setTool(tool: BoardTool): void {
    this.commitEditor();
    this.store.tool.set(tool);
    if (tool !== 'select') this.store.selectedId.set(null);
  }

  // Con "Seleccionar" activo, los cambios de la barra se aplican al elemento elegido.
  protected setColor(color: string): void {
    this.store.color.set(color);
    if (this.store.tool() === 'select') this.store.applyToSelected({ color });
  }
  protected setWidth(width: number): void {
    this.store.width.set(width);
    if (this.store.tool() === 'select') this.store.applyToSelected({ width });
  }
  protected setSize(size: number): void {
    this.store.textSize.set(size);
    if (this.store.tool() === 'select') this.store.applyToSelected({ size });
  }
  protected setTable(which: 'rows' | 'cols', value: number): void {
    const v = Math.round(Math.min(which === 'rows' ? 12 : 8, Math.max(1, value || 1)));
    (which === 'rows' ? this.store.tableRows : this.store.tableCols).set(v);
  }

  // --- Imágenes (selector y pegar) -------------------------------------------------------------

  @HostListener('document:paste', ['$event'])
  protected onPaste(e: ClipboardEvent): void {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
    if (file) {
      e.preventDefault();
      void this.insertImage(file);
    }
  }

  protected onImagePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) void this.insertImage(file);
  }

  /** Reduce la imagen a 1600 px como máximo, la centra en la página y la deja seleccionada. */
  private async insertImage(file: File): Promise<void> {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      this.announcer.announce('Formato de imagen no permitido (usa PNG, JPG, WEBP o GIF).', 'error');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.announcer.announce('La imagen supera los 8 MB.', 'error');
      return;
    }
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * k);
      canvas.height = Math.round(bmp.height * k);
      canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const src = canvas.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.9);
      await loadImage(src);
      const fit = Math.min(640 / canvas.width, 480 / canvas.height, 1);
      const w = Math.round(canvas.width * fit), h = Math.round(canvas.height * fit);
      const el: BoardElement = { ...this.store.baseProps(), type: 'image', x: Math.round((BOARD_WIDTH - w) / 2), y: Math.round((BOARD_HEIGHT - h) / 2), w, h, src };
      this.store.addElement(el);
      this.store.tool.set('select');
      this.store.selectedId.set(el.id);
      this.announcer.announce('Imagen insertada: arrastra la esquina para cambiar su tamaño');
      this.draw();
    } catch {
      this.announcer.announce('No pudimos leer la imagen.', 'error');
    }
  }

  // --- Zoom, borrado y exportación -----------------------------------------------------------

  protected fit(): void {
    const v = this.viewport().nativeElement;
    this.store.setZoom(Math.min((v.clientWidth - 32) / BOARD_WIDTH, (v.clientHeight - 32) / BOARD_HEIGHT));
  }

  protected confirmClear(): void {
    this.store.clearPage();
    this.clearOpen.set(false);
    this.announcer.announce('Página limpiada');
  }

  protected confirmDelete(): void {
    this.store.removePage();
    this.deleteOpen.set(false);
    this.announcer.announce('Página eliminada');
  }

  protected async downloadPng(): Promise<void> {
    await this.run(async () => {
      saveBlob(await exportPagePng(this.store.currentPage()), `tablero-pagina-${this.store.pageIndex() + 1}.png`);
    }, 'PNG descargado');
  }

  protected async downloadPdf(all: boolean): Promise<void> {
    await this.run(async () => {
      const pages = all ? this.store.pages() : [this.store.currentPage()];
      saveBlob(await exportPdf(pages), all ? 'tablero-completo.pdf' : `tablero-pagina-${this.store.pageIndex() + 1}.pdf`);
    }, 'PDF descargado');
  }

  private async run(job: () => Promise<void>, ok: string): Promise<void> {
    this.exporting.set(true);
    try {
      await job();
      this.announcer.announce(ok);
    } catch {
      this.announcer.announce('No pudimos generar el archivo. Inténtalo de nuevo.', 'error');
    } finally {
      this.exporting.set(false);
    }
  }

  // --- Diálogo y teclado ---------------------------------------------------------------------

  protected requestClose(): void {
    this.closed.emit();
  }

  protected onKey(e: KeyboardEvent): void {
    const typing = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'SELECT';
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) {
      e.preventDefault();
      if (e.shiftKey) this.store.redo(); else this.store.undo();
    } else if (mod && e.key.toLowerCase() === 'y' && !typing) {
      e.preventDefault();
      this.store.redo();
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing) {
      e.preventDefault();
      this.store.removeSelected();
    }
    this.draw();
  }
}
