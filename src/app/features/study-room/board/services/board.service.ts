import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { apiRoutes } from '../../../../core/config/api-routes';
import { runtimeConfig } from '../../../../core/config/runtime-config';
import { whenEnabled } from '../../../../core/http/feature-flag';
import { BoardDto, BoardPageDto, BoardStateDto } from '../models/board.dto';
import { toBoard, toElementDto, toPageDto } from '../models/board.mapper';
import { Board, BoardElement, BoardPage, BoardState } from '../models/board.models';

/**
 * Persistencia del tablero (sin estado). Contrato PROPUESTO (PENDIENTE DE IMPLEMENTACIÓN EN
 * BACKEND), ver docs/BACKEND-INTEGRATION.md. La edición funciona sin él (solo local).
 */
export abstract class BoardService {
  abstract readonly isDemo: boolean;
  abstract getBoard(roomId: string): Observable<Board>;
  abstract createPage(roomId: string, page: BoardPage): Observable<BoardPage>;
  /** Reemplaza el contenido de una página. */
  abstract updatePage(roomId: string, page: BoardPage): Observable<BoardPage>;
  abstract deletePage(roomId: string, pageId: string): Observable<void>;
  /** Granular (para sincronización futura): añade elementos a una página. */
  abstract saveElements(roomId: string, pageId: string, elements: BoardElement[]): Observable<void>;
  abstract deleteElements(roomId: string, pageId: string, elementIds: string[]): Observable<void>;
  abstract getState(roomId: string): Observable<BoardState>;
}

/** Adaptador HTTP del contrato propuesto; inactivo (`contract-pending`) hasta `features.boardApi`. */
@Injectable()
export class HttpBoardService extends BoardService {
  readonly isDemo = false;
  private readonly http = inject(HttpClient);
  private readonly base = runtimeConfig.apiUrl;

  getBoard(roomId: string): Observable<Board> {
    return whenEnabled('boardApi', `GET ${apiRoutes.board(roomId)}`, () =>
      this.http.get<BoardDto>(`${this.base}${apiRoutes.board(roomId)}`).pipe(map(toBoard))
    );
  }
  createPage(roomId: string, page: BoardPage): Observable<BoardPage> {
    return whenEnabled('boardApi', `POST ${apiRoutes.boardPages(roomId)}`, () =>
      this.http.post<BoardPageDto>(`${this.base}${apiRoutes.boardPages(roomId)}`, toPageDto(page)).pipe(map(() => page))
    );
  }
  updatePage(roomId: string, page: BoardPage): Observable<BoardPage> {
    return whenEnabled('boardApi', `PUT ${apiRoutes.boardPage(roomId, page.id)}`, () =>
      this.http.put<BoardPageDto>(`${this.base}${apiRoutes.boardPage(roomId, page.id)}`, toPageDto(page)).pipe(map(() => page))
    );
  }
  deletePage(roomId: string, pageId: string): Observable<void> {
    return whenEnabled('boardApi', `DELETE ${apiRoutes.boardPage(roomId, pageId)}`, () =>
      this.http.delete<void>(`${this.base}${apiRoutes.boardPage(roomId, pageId)}`)
    );
  }
  saveElements(roomId: string, pageId: string, elements: BoardElement[]): Observable<void> {
    return whenEnabled('boardApi', `POST ${apiRoutes.boardPage(roomId, pageId)}/elements`, () =>
      this.http.post<void>(`${this.base}${apiRoutes.boardPage(roomId, pageId)}/elements`, elements.map(toElementDto))
    );
  }
  deleteElements(roomId: string, pageId: string, elementIds: string[]): Observable<void> {
    return whenEnabled('boardApi', `DELETE ${apiRoutes.boardPage(roomId, pageId)}/elements`, () =>
      this.http.request<void>('DELETE', `${this.base}${apiRoutes.boardPage(roomId, pageId)}/elements`, { body: { ids: elementIds } })
    );
  }
  getState(roomId: string): Observable<BoardState> {
    return whenEnabled('boardApi', `GET ${apiRoutes.board(roomId)}/state`, () =>
      this.http.get<BoardStateDto>(`${this.base}${apiRoutes.board(roomId)}/state`)
    );
  }
}
