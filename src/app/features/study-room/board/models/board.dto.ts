import { BoardElement, BoardElementType, BoardPage } from './board.models';

/**
 * DTO "wire" PROPUESTOS del tablero (PENDIENTE DE IMPLEMENTACIÓN EN BACKEND). `data` lleva las
 * propiedades geométricas de cada tipo (ver `board.mapper.ts`) para que backend pueda guardarlas
 * sin conocer cada figura.
 */
export interface BoardElementDto {
  id: string;
  type: BoardElementType;
  color: string;
  width: number;
  authorUid: string;
  createdAt: string;
  data: Record<string, unknown>;
}

export interface BoardPageDto {
  id: string;
  elements: BoardElementDto[];
}

export interface BoardDto {
  roomId: string;
  pages: BoardPageDto[];
}

export interface BoardStateDto {
  revision: number;
  updatedAt: string | null;
}

export type { BoardElement, BoardPage };
