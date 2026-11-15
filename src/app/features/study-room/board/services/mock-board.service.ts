import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { mockOk } from '../../../../core/http/mock-latency';
import { Board, BoardElement, BoardPage, BoardState } from '../models/board.models';
import { BoardService } from './board.service';

/** MOCK: guarda el tablero en memoria de esta pestaña (se pierde al recargar). Solo desarrollo. */
@Injectable()
export class MockBoardService extends BoardService {
  readonly isDemo = true;
  private readonly boards = new Map<string, BoardPage[]>();
  private revision = 0;

  private pages(roomId: string): BoardPage[] {
    if (!this.boards.has(roomId)) this.boards.set(roomId, []);
    return this.boards.get(roomId)!;
  }

  getBoard(roomId: string): Observable<Board> {
    return mockOk({ roomId, pages: structuredClone(this.pages(roomId)) });
  }
  createPage(roomId: string, page: BoardPage): Observable<BoardPage> {
    this.pages(roomId).push(structuredClone(page));
    this.revision++;
    return mockOk(page);
  }
  updatePage(roomId: string, page: BoardPage): Observable<BoardPage> {
    const pages = this.pages(roomId);
    const i = pages.findIndex((p) => p.id === page.id);
    if (i >= 0) pages[i] = structuredClone(page);
    else pages.push(structuredClone(page));
    this.revision++;
    return mockOk(page);
  }
  deletePage(roomId: string, pageId: string): Observable<void> {
    this.boards.set(roomId, this.pages(roomId).filter((p) => p.id !== pageId));
    this.revision++;
    return mockOk(undefined);
  }
  saveElements(roomId: string, pageId: string, elements: BoardElement[]): Observable<void> {
    this.pages(roomId).find((p) => p.id === pageId)?.elements.push(...structuredClone(elements));
    this.revision++;
    return mockOk(undefined);
  }
  deleteElements(roomId: string, pageId: string, ids: string[]): Observable<void> {
    const page = this.pages(roomId).find((p) => p.id === pageId);
    if (page) page.elements = page.elements.filter((e) => !ids.includes(e.id));
    this.revision++;
    return mockOk(undefined);
  }
  getState(): Observable<BoardState> {
    return mockOk({ revision: this.revision, updatedAt: null });
  }
}
