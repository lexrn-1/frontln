import { BoardElement, Point } from './models/board.models';

export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Rectángulo normalizado (ancho/alto positivos) entre dos esquinas. */
export function rectFrom(a: Point, b: Point): Bounds {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

export function boundsOf(el: BoardElement): Bounds {
  switch (el.type) {
    case 'pen': {
      const xs = el.points.map((p) => p.x);
      const ys = el.points.map((p) => p.y);
      const x = Math.min(...xs), y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }
    case 'line':
    case 'arrow':
      return rectFrom(el.from, el.to);
    case 'rect':
    case 'ellipse':
    case 'image':
    case 'table':
      return { x: el.x, y: el.y, w: el.w, h: el.h };
    case 'icon':
      return { x: el.x, y: el.y, w: el.size * 1.25, h: el.size * 1.25 };
    case 'text': {
      const lines = el.text.split('\n');
      const longest = Math.max(...lines.map((l) => l.length));
      return { x: el.x, y: el.y, w: longest * el.size * 0.6, h: lines.length * el.size * 1.25 };
    }
  }
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** ¿El punto toca el elemento? `tolerance` en unidades lógicas (se suma al grosor del trazo). */
export function hitTest(el: BoardElement, p: Point, tolerance = 6): boolean {
  const tol = tolerance + el.width / 2;
  switch (el.type) {
    case 'pen': {
      if (el.points.length === 1) return Math.hypot(p.x - el.points[0].x, p.y - el.points[0].y) <= tol;
      return el.points.some((pt, i) => i > 0 && distanceToSegment(p, el.points[i - 1], pt) <= tol);
    }
    case 'line':
    case 'arrow':
      return distanceToSegment(p, el.from, el.to) <= tol;
    case 'rect': {
      const b = boundsOf(el);
      const inside = p.x >= b.x - tol && p.x <= b.x + b.w + tol && p.y >= b.y - tol && p.y <= b.y + b.h + tol;
      const innerW = b.w - 2 * tol, innerH = b.h - 2 * tol;
      const deep = innerW > 0 && innerH > 0 && p.x > b.x + tol && p.x < b.x + b.w - tol && p.y > b.y + tol && p.y < b.y + b.h - tol;
      return inside && !deep;
    }
    case 'ellipse': {
      const cx = el.x + el.w / 2, cy = el.y + el.h / 2;
      const rx = Math.max(el.w / 2, 1), ry = Math.max(el.h / 2, 1);
      const k = Math.hypot((p.x - cx) / rx, (p.y - cy) / ry);
      return Math.abs(k - 1) * Math.min(rx, ry) <= tol;
    }
    case 'image':
    case 'table':
    case 'icon':
    case 'text': {
      const b = boundsOf(el);
      return p.x >= b.x - tol && p.x <= b.x + b.w + tol && p.y >= b.y - tol && p.y <= b.y + b.h + tol;
    }
  }
}

export function translate(el: BoardElement, dx: number, dy: number): BoardElement {
  switch (el.type) {
    case 'pen':
      return { ...el, points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
    case 'line':
    case 'arrow':
      return { ...el, from: { x: el.from.x + dx, y: el.from.y + dy }, to: { x: el.to.x + dx, y: el.to.y + dy } };
    case 'rect':
    case 'ellipse':
    case 'text':
    case 'image':
    case 'table':
    case 'icon':
      return { ...el, x: el.x + dx, y: el.y + dy };
  }
}

/** Elemento más alto (último dibujado) bajo el punto, o `null`. */
export function topmostAt(elements: readonly BoardElement[], p: Point, tolerance = 8): BoardElement | null {
  for (let i = elements.length - 1; i >= 0; i--) if (hitTest(elements[i], p, tolerance)) return elements[i];
  return null;
}

/** ¿Se puede cambiar su tamaño arrastrando la esquina inferior derecha? */
export function isResizable(el: BoardElement): boolean {
  return el.type === 'rect' || el.type === 'ellipse' || el.type === 'image' || el.type === 'table' || el.type === 'icon';
}

/** Posición del tirador de tamaño (esquina inferior derecha del contorno). */
export function handlePoint(el: BoardElement): Point {
  const b = boundsOf(el);
  return { x: b.x + b.w, y: b.y + b.h };
}

/** Lleva la esquina inferior derecha a `p` (mínimo 16). Imágenes e iconos conservan su proporción. */
export function resizeTo(el: BoardElement, p: Point): BoardElement {
  switch (el.type) {
    case 'image': {
      const w = Math.max(16, p.x - el.x);
      return { ...el, w, h: Math.max(16, (w * el.h) / el.w) };
    }
    case 'icon':
      return { ...el, size: Math.max(12, Math.round((p.x - el.x) / 1.25)) };
    case 'rect':
    case 'ellipse':
    case 'table':
      return { ...el, w: Math.max(16, p.x - el.x), h: Math.max(16, p.y - el.y) };
    default:
      return el;
  }
}

/** Fila y columna de una tabla bajo el punto, o `null` si está fuera. */
export function tableCellAt(el: BoardElement, p: Point): { row: number; col: number } | null {
  if (el.type !== 'table') return null;
  if (p.x < el.x || p.y < el.y || p.x > el.x + el.w || p.y > el.y + el.h) return null;
  return {
    row: Math.min(el.rows - 1, Math.floor(((p.y - el.y) / el.h) * el.rows)),
    col: Math.min(el.cols - 1, Math.floor(((p.x - el.x) / el.w) * el.cols))
  };
}
