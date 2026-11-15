import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { CurrentUser } from '../../auth/store/current-user.store';
import { FilesService } from '../../files/files.service';
import { AppError } from '../../http/app-error';
import { mockFail, mockOk } from '../../http/mock-latency';
import { RoomsService } from '../../rooms/services/rooms.service';
import { ChatMessage, Conversation, MessagePage, MessageQuery, SendMessageRequest } from '../models/chat.models';
import { toneFor } from '../models/chat.mapper';
import { ChatService } from '../services/chat.service';
import { seedMessages, seedUnread } from './chat.mock-data';

/**
 * MOCK: historial en memoria COMPARTIDO por todas las interfaces (misma instancia de servicio), con
 * paginación por cursor y no leídos. Mensajes inventados; se reinician al recargar.
 */
@Injectable()
export class MockChatService extends ChatService {
  readonly isDemo = true;
  private readonly rooms = inject(RoomsService);
  private readonly files = inject(FilesService);
  private readonly user = inject(CurrentUser);
  private readonly messages = seedMessages();
  private readonly unread = seedUnread();

  private list(roomId: string): ChatMessage[] {
    if (!this.messages.has(roomId)) this.messages.set(roomId, []);
    return this.messages.get(roomId)!;
  }

  private toConversation(room: { id: string; name: string; subject: string; participantCount: number }): Conversation {
    const last = this.list(room.id).at(-1) ?? null;
    return {
      roomId: room.id,
      name: room.name,
      subject: room.subject,
      tone: toneFor(room.id),
      participantCount: room.participantCount,
      unreadCount: this.unread.get(room.id) ?? 0,
      lastMessage: last
        ? { text: last.text, authorName: last.own ? 'Tú' : last.authorName, sentAt: last.sentAt, hasAttachments: last.attachments.length > 0 }
        : null,
      lastActivityAt: last?.sentAt ?? null
    };
  }

  listConversations(): Observable<Conversation[]> {
    return this.rooms.listMine().pipe(
      map((rooms) =>
        rooms
          .map((r) => this.toConversation(r))
          .sort((a, b) => (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? ''))
      )
    );
  }

  getConversation(roomId: string): Observable<Conversation> {
    return this.rooms.getById(roomId).pipe(
      switchMap((room) =>
        room.isMember
          ? of(this.toConversation(room))
          : mockFail<Conversation>(new AppError('forbidden', 'No perteneces a esta sala, así que no puedes ver su conversación.', 403))
      )
    );
  }

  listMessages(roomId: string, query: MessageQuery): Observable<MessagePage> {
    const all = this.list(roomId);
    const end = query.before ? all.findIndex((m) => m.id === query.before) : all.length;
    const stop = end < 0 ? all.length : end;
    const start = Math.max(0, stop - query.limit);
    return mockOk({ messages: all.slice(start, stop), nextCursor: start > 0 ? all[start].id : null });
  }

  sendMessage(roomId: string, request: SendMessageRequest): Observable<ChatMessage> {
    const all = this.list(roomId);
    const existing = all.find((m) => m.id === request.clientMessageId);
    if (existing) return mockOk(existing);
    const profile = this.user.profile();
    const name = profile ? `${profile.nombres} ${profile.apellidos}`.trim() : 'Tú';
    const attachments$ = request.attachmentIds.length
      ? forkJoin(request.attachmentIds.map((id) => this.files.getMetadata(id)))
      : of([]);
    return attachments$.pipe(
      map((attachments) => {
        const message: ChatMessage = {
          id: request.clientMessageId, roomId, authorId: profile?.uid ?? 'me', authorName: name,
          authorInitial: name.charAt(0).toUpperCase(), tone: 'rose', text: request.text, attachments,
          sentAt: new Date().toISOString(), own: true
        };
        all.push(message);
        return message;
      })
    );
  }

  markRead(roomId: string): Observable<void> {
    this.unread.set(roomId, 0);
    return mockOk(undefined);
  }

  unreadCount(): Observable<number> {
    return mockOk([...this.unread.values()].reduce((a, b) => a + b, 0));
  }
}
