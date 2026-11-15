import { BoardDto, BoardElementDto, BoardPageDto } from './board.dto';
import { Board, BoardElement, BoardPage } from './board.models';

/** Separa la parte común del elemento de su geometría (`data`). */
export function toElementDto(el: BoardElement): BoardElementDto {
  const { id, type, color, width, authorId, createdAt, ...data } = el;
  return { id, type, color, width, authorUid: authorId, createdAt, data };
}

export function toElement(dto: BoardElementDto): BoardElement {
  return {
    id: dto.id, type: dto.type, color: dto.color, width: dto.width, authorId: dto.authorUid, createdAt: dto.createdAt,
    ...dto.data
  } as BoardElement;
}

export function toPageDto(page: BoardPage): BoardPageDto {
  return { id: page.id, elements: page.elements.map(toElementDto) };
}

export function toPage(dto: BoardPageDto): BoardPage {
  return { id: dto.id, elements: dto.elements.map(toElement) };
}

export function toBoard(dto: BoardDto): Board {
  return { roomId: dto.roomId, pages: dto.pages.map(toPage) };
}
