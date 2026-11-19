import { AppError } from '../../http/app-error';
import { RoomsService, HttpRoomsService } from '../../rooms/services/rooms.service';
import { Room } from '../../rooms/models/room.models';
import { RealtimeService } from '../../realtime/realtime.service';
import { toneFor } from '../models/chat.mapper';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, from, of, catchError, throwError } from 'rxjs';

import { CurrentUser } from '../../auth/store/current-user.store';
import { apiRoutes } from '../../config/api-routes';
import { runtimeConfig } from '../../config/runtime-config';
import { ConversationDto, MessageDto, MessagePageDto, SendMessageRequestDto, UnreadCountDto } from '../models/chat.dto';
import { toConversation, toMessage, toMessagePage } from '../models/chat.mapper';
import { ChatMessage, Conversation, MessagePage, MessageQuery, SendMessageRequest } from '../models/chat.models';

export abstract class ChatService {
  abstract readonly isDemo: boolean;
  /** Conversaciones (una por sala) del usuario, con último mensaje y no leídos. */
  abstract listConversations(): Observable<Conversation[]>;
  /** 403/404 si el usuario no pertenece a la sala. */
  abstract getConversation(roomId: string): Observable<Conversation>;
  abstract listMessages(roomId: string, query: MessageQuery): Observable<MessagePage>;
  abstract sendMessage(roomId: string, request: SendMessageRequest): Observable<ChatMessage>;
  abstract markRead(roomId: string): Observable<void>;
  abstract unreadCount(): Observable<number>;
}

/** Historial REST con recuperación por Socket.IO; envío persistente mediante ack. */
@Injectable()
export class HttpChatService extends ChatService {
  readonly isDemo = false;
  private readonly http = inject(HttpClient);
  private readonly user = inject(CurrentUser);
  private readonly base = runtimeConfig.apiUrl;
  private get uid(): string | null {
    return this.user.profile()?.uid ?? null;
  }

  private readonly rooms = inject(RoomsService);
  private readonly realtime = inject(RealtimeService);
  private conversation(r: Room): Conversation {
    return {
      roomId: r.id,
      name: r.name,
      subject: '',
      tone: toneFor(r.id),
      participantCount: 0,
      unreadCount: 0,
      lastActivityAt: null,
      lastMessage: null,
    };
  }
  listConversations(): Observable<Conversation[]> {
    const source = this.rooms instanceof HttpRoomsService ? this.rooms.list('member') : this.rooms.listMine();
    return source.pipe(map((rooms) => rooms.map((r) => this.conversation(r))));
  }
  getConversation(roomId: string): Observable<Conversation> {
    return this.rooms.getById(roomId).pipe(map((r) => this.conversation(r)));
  }
  listMessages(roomId: string, query: MessageQuery): Observable<MessagePage> {
    let params = new HttpParams().set('limit', query.limit);
    if (query.before) params = params.set('before', query.before);
    if (query.after) params = params.set('after', query.after);
    return this.http
      .get<MessagePageDto>(`${this.base}${apiRoutes.roomMessages(roomId)}`, {
        params,
      })
      .pipe(
        // A shared gateway may still route history to API. Use the same authenticated
        // realtime application port; never turn authentication/permission failures into retries.
        catchError((error: unknown) => {
          if (!(error instanceof HttpErrorResponse || error instanceof AppError) || ![404, 405].includes(error.status))
            return throwError(() => error);
          const payload = {
            limit: query.limit,
            ...(query.before ? { before: query.before } : {}),
            ...(query.after ? { after: query.after } : {}),
          };
          return from(this.realtime.request<MessagePageDto>('chat:history', roomId, payload));
        }),
        map((page) => toMessagePage(page, this.uid))
      );
  }
  sendMessage(roomId: string, request: SendMessageRequest): Observable<ChatMessage> {
    return from(
      this.realtime.enter(roomId).then(() =>
        this.realtime.request<MessageDto>('chat:send', roomId, {
          text: request.text,
          clientMessageId: request.clientMessageId,
        })
      )
    ).pipe(map((m) => toMessage(m, this.uid)));
  }
  // No existe persistencia de lecturas/no leídos en este alcance.
  markRead(_roomId: string): Observable<void> {
    return of(undefined);
  }
  unreadCount(): Observable<number> {
    return of(0);
  }
}
