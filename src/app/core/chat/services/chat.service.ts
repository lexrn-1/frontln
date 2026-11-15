import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { CurrentUser } from '../../auth/store/current-user.store';
import { apiRoutes } from '../../config/api-routes';
import { runtimeConfig } from '../../config/runtime-config';
import { whenEnabled } from '../../http/feature-flag';
import { ConversationDto, MessageDto, MessagePageDto, SendMessageRequestDto, UnreadCountDto } from '../models/chat.dto';
import { toConversation, toMessage, toMessagePage } from '../models/chat.mapper';
import { ChatMessage, Conversation, MessagePage, MessageQuery, SendMessageRequest } from '../models/chat.models';

/**
 * Acceso a datos del chat (sin estado). Es la ÚNICA puerta al historial: el chat integrado en la
 * sala y `/chats` pasan por `ChatStore`, que usa este servicio. Contrato PROPUESTO
 * (PENDIENTE DE IMPLEMENTACIÓN EN BACKEND), ver docs/BACKEND-INTEGRATION.md.
 */
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

/** Adaptador HTTP del contrato propuesto; inactivo (`contract-pending`) hasta `features.chatApi`. */
@Injectable()
export class HttpChatService extends ChatService {
  readonly isDemo = false;
  private readonly http = inject(HttpClient);
  private readonly user = inject(CurrentUser);
  private readonly base = runtimeConfig.apiUrl;
  private get uid(): string | null {
    return this.user.profile()?.uid ?? null;
  }

  listConversations(): Observable<Conversation[]> {
    return whenEnabled('chatApi', `GET ${apiRoutes.chats}`, () =>
      this.http.get<ConversationDto[]>(`${this.base}${apiRoutes.chats}`).pipe(map((list) => list.map((c) => toConversation(c, this.uid))))
    );
  }

  getConversation(roomId: string): Observable<Conversation> {
    return whenEnabled('chatApi', `GET ${apiRoutes.chat(roomId)}`, () =>
      this.http.get<ConversationDto>(`${this.base}${apiRoutes.chat(roomId)}`).pipe(map((c) => toConversation(c, this.uid)))
    );
  }

  listMessages(roomId: string, query: MessageQuery): Observable<MessagePage> {
    return whenEnabled('chatApi', `GET ${apiRoutes.chatMessages(roomId)}`, () => {
      let params = new HttpParams().set('limit', query.limit);
      if (query.before) params = params.set('before', query.before);
      return this.http
        .get<MessagePageDto>(`${this.base}${apiRoutes.chatMessages(roomId)}`, { params })
        .pipe(map((page) => toMessagePage(page, this.uid)));
    });
  }

  sendMessage(roomId: string, request: SendMessageRequest): Observable<ChatMessage> {
    return whenEnabled('chatApi', `POST ${apiRoutes.chatMessages(roomId)}`, () => {
      const body: SendMessageRequestDto = { ...request };
      return this.http.post<MessageDto>(`${this.base}${apiRoutes.chatMessages(roomId)}`, body).pipe(map((m) => toMessage(m, this.uid)));
    });
  }

  markRead(roomId: string): Observable<void> {
    return whenEnabled('chatApi', `PATCH ${apiRoutes.chatRead(roomId)}`, () =>
      this.http.patch<void>(`${this.base}${apiRoutes.chatRead(roomId)}`, null)
    );
  }

  unreadCount(): Observable<number> {
    return whenEnabled('chatApi', `GET ${apiRoutes.chatsUnread}`, () =>
      this.http.get<UnreadCountDto>(`${this.base}${apiRoutes.chatsUnread}`).pipe(map((r) => r.total))
    );
  }
}
