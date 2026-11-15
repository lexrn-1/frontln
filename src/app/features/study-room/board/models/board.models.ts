/**
 * Modelo del tablero de estudio. Cada página es una lista de elementos vectoriales en un espacio
 * lógico de BOARD_WIDTH × BOARD_HEIGHT; el zoom solo cambia cómo se dibuja. El contrato con
 * backend es PROPUESTO (PENDIENTE DE IMPLEMENTACIÓN): ver `board.dto.ts` y docs/BACKEND-INTEGRATION.md.
 */
export const BOARD_WIDTH = 1600;
export const BOARD_HEIGHT = 1000;

export type BoardTool = 'select' | 'pen' | 'eraser' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'table' | 'icon';
export type BoardElementType = 'pen' | 'line' | 'arrow' | 'rect' | 'ellipse' | 'text' | 'image' | 'table' | 'icon';

export interface Point {
  x: number;
  y: number;
}

interface BaseElement {
  id: string;
  color: string;
  /** Grosor del trazo en unidades lógicas. */
  width: number;
  authorId: string;
  /** ISO 8601 UTC. */
  createdAt: string;
}

export interface PenElement extends BaseElement { type: 'pen'; points: Point[] }
export interface LineElement extends BaseElement { type: 'line'; from: Point; to: Point }
export interface ArrowElement extends BaseElement { type: 'arrow'; from: Point; to: Point }
export interface RectElement extends BaseElement { type: 'rect'; x: number; y: number; w: number; h: number }
export interface EllipseElement extends BaseElement { type: 'ellipse'; x: number; y: number; w: number; h: number }
export interface TextElement extends BaseElement { type: 'text'; x: number; y: number; text: string; size: number }

/** Imagen pegada o cargada; `src` es una URL de datos (reducida a 1600 px como máximo). */
export interface ImageElement extends BaseElement { type: 'image'; x: number; y: number; w: number; h: number; src: string }
/** Tabla de `rows` × `cols`; `cells` va por filas (`rows * cols` textos). */
export interface TableElement extends BaseElement { type: 'table'; x: number; y: number; w: number; h: number; rows: number; cols: number; cells: string[] }
export interface IconElement extends BaseElement { type: 'icon'; x: number; y: number; size: number; glyph: string }

export type BoardElement = PenElement | LineElement | ArrowElement | RectElement | EllipseElement | TextElement | ImageElement | TableElement | IconElement;

export interface BoardPage {
  id: string;
  elements: BoardElement[];
}

export interface Board {
  roomId: string;
  pages: BoardPage[];
}

/** Estado ligero para saber si hay cambios remotos (sincronización futura). */
export interface BoardState {
  revision: number;
  updatedAt: string | null;
}

/** Operaciones que la interfaz produce; punto de enganche para sincronizar por WebSocket. */
export type BoardOperation =
  | { type: 'element.add'; pageId: string; element: BoardElement }
  | { type: 'element.update'; pageId: string; element: BoardElement }
  | { type: 'element.remove'; pageId: string; elementId: string }
  | { type: 'page.replace'; pageId: string; elements: BoardElement[] }
  | { type: 'page.add'; pageId: string }
  | { type: 'page.remove'; pageId: string };

export type PersistenceStatus = 'local' | 'saving' | 'saved' | 'error';

export const BOARD_COLORS = [
  { value: '#1f1c1a', label: 'Negro' },
  { value: '#b93a27', label: 'Rojo coral' },
  { value: '#1d5fa8', label: 'Azul' },
  { value: '#2f6b4a', label: 'Verde' },
  { value: '#8a5a00', label: 'Ámbar' },
  { value: '#6b3fa0', label: 'Violeta' }
] as const;

/** Símbolos disponibles para la herramienta "Icono". */
export const BOARD_ICONS = ['⭐', '✅', '❌', '❗', '❓', '💡', '📌', '📖', '📝', '🔬', '🧮', '💻', '🎯', '⚠️', '❤️', '👍', '🔥', '⏰', '➕', '➡️'] as const;
