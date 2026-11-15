import { boundsOf, handlePoint, isResizable } from './board-geometry';
import { BOARD_HEIGHT, BOARD_WIDTH, BoardElement } from './models/board.models';

const images = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement>>();
let onReady: (() => void) | null = null;

/** Avisa cuando una imagen termina de cargar para volver a dibujar. */
export function setImageReadyListener(cb: (() => void) | null): void {
  onReady = cb;
}

/** Carga (y guarda en caché) una imagen a partir de su URL de datos. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = images.get(src);
  if (cached) return Promise.resolve(cached);
  let job = pending.get(src);
  if (!job) {
    job = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        images.set(src, img);
        pending.delete(src);
        resolve(img);
      };
      img.onerror = () => {
        pending.delete(src);
        reject(new Error('image-load-failed'));
      };
      img.src = src;
    });
    pending.set(src, job);
  }
  return job;
}

/** Espera a que estén cargadas todas las imágenes de los elementos (necesario antes de exportar). */
export async function preloadImages(elements: readonly BoardElement[]): Promise<void> {
  await Promise.all(elements.filter((e) => e.type === 'image').map((e) => loadImage((e as { src: string }).src).catch(() => undefined)));
}

/** Dibuja un elemento en coordenadas lógicas (el llamador aplica la escala del zoom). */
export function drawElement(ctx: CanvasRenderingContext2D, el: BoardElement): void {
  ctx.save();
  ctx.strokeStyle = el.color;
  ctx.fillStyle = el.color;
  ctx.lineWidth = el.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  switch (el.type) {
    case 'pen': {
      ctx.beginPath();
      el.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      if (el.points.length === 1) ctx.lineTo(el.points[0].x + 0.01, el.points[0].y);
      ctx.stroke();
      break;
    }
    case 'line':
    case 'arrow': {
      ctx.beginPath();
      ctx.moveTo(el.from.x, el.from.y);
      ctx.lineTo(el.to.x, el.to.y);
      ctx.stroke();
      if (el.type === 'arrow') {
        const angle = Math.atan2(el.to.y - el.from.y, el.to.x - el.from.x);
        const head = Math.max(12, el.width * 4);
        ctx.beginPath();
        ctx.moveTo(el.to.x, el.to.y);
        ctx.lineTo(el.to.x - head * Math.cos(angle - Math.PI / 6), el.to.y - head * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(el.to.x, el.to.y);
        ctx.lineTo(el.to.x - head * Math.cos(angle + Math.PI / 6), el.to.y - head * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
      break;
    }
    case 'rect':
      ctx.strokeRect(el.x, el.y, el.w, el.h);
      break;
    case 'ellipse':
      ctx.beginPath();
      ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, Math.abs(el.w / 2), Math.abs(el.h / 2), 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'image': {
      const img = images.get(el.src);
      if (img) ctx.drawImage(img, el.x, el.y, el.w, el.h);
      else void loadImage(el.src).then(() => onReady?.(), () => undefined);
      break;
    }
    case 'table': {
      const cw = el.w / el.cols, ch = el.h / el.rows;
      ctx.strokeRect(el.x, el.y, el.w, el.h);
      ctx.lineWidth = Math.max(1, el.width / 2);
      ctx.beginPath();
      for (let r = 1; r < el.rows; r++) { ctx.moveTo(el.x, el.y + r * ch); ctx.lineTo(el.x + el.w, el.y + r * ch); }
      for (let c = 1; c < el.cols; c++) { ctx.moveTo(el.x + c * cw, el.y); ctx.lineTo(el.x + c * cw, el.y + el.h); }
      ctx.stroke();
      const size = Math.max(10, Math.min(24, ch * 0.45));
      ctx.font = `${size}px "DM Sans", Arial, sans-serif`;
      ctx.textBaseline = 'middle';
      el.cells.forEach((text, i) => {
        if (!text) return;
        const x = el.x + (i % el.cols) * cw, y = el.y + Math.floor(i / el.cols) * ch;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 2, y, cw - 4, ch);
        ctx.clip();
        ctx.fillText(text, x + 8, y + ch / 2);
        ctx.restore();
      });
      break;
    }
    case 'icon':
      ctx.font = `${el.size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textBaseline = 'top';
      ctx.fillText(el.glyph, el.x, el.y);
      break;
    case 'text': {
      ctx.font = `${el.size}px "DM Sans", Arial, sans-serif`;
      ctx.textBaseline = 'top';
      el.text.split('\n').forEach((line, i) => ctx.fillText(line, el.x, el.y + i * el.size * 1.25));
      break;
    }
  }
  ctx.restore();
}

export function drawSelection(ctx: CanvasRenderingContext2D, el: BoardElement, zoom: number): void {
  const b = boundsOf(el);
  const pad = 6 / zoom;
  ctx.save();
  ctx.strokeStyle = '#1d5fa8';
  ctx.lineWidth = 1.5 / zoom;
  ctx.setLineDash([6 / zoom, 4 / zoom]);
  ctx.strokeRect(b.x - pad, b.y - pad, b.w + pad * 2, b.h + pad * 2);
  ctx.restore();
  if (isResizable(el)) {
    const h = handlePoint(el);
    const s = 10 / zoom;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#1d5fa8';
    ctx.lineWidth = 2 / zoom;
    ctx.fillRect(h.x + pad - s / 2, h.y + pad - s / 2, s, s);
    ctx.strokeRect(h.x + pad - s / 2, h.y + pad - s / 2, s, s);
    ctx.restore();
  }
}

/** Fondo blanco + elementos de la página. Sin selección ni controles: es lo que se exporta. */
export function renderPage(ctx: CanvasRenderingContext2D, elements: readonly BoardElement[]): void {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT);
  elements.forEach((el) => drawElement(ctx, el));
  ctx.restore();
}
