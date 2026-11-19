import { AuthStore } from '../../auth/store/auth.store';
import { Injectable, DestroyRef, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CurrentUser } from '../../auth/store/current-user.store';
import { runtimeConfig } from '../../config/runtime-config';
import { FilesService } from '../../files/files.service';
import { AppError } from '../../http/app-error';
import { RealtimeService, REALTIME_EVENTS } from '../../realtime/realtime.service';
import { LoadState } from '../../rooms/store/rooms.store';
import { toMessage } from '../models/chat.mapper';
import { ChatMessage, Conversation, MessagePage, FileAttachment, OutgoingMessage } from '../models/chat.models';
import { ChatService } from '../services/chat.service';

/** Estado de la conversación de UNA sala. */
export interface RoomChat {
  messages: ChatMessage[];
  state: LoadState;
  error: string | null;
  historyError: string | null;
  /** Cursor de mensajes anteriores; `null` si no hay más. */
  nextCursor: string | null;
  loadingOlder: boolean;
  sending: boolean;
  sendError: string | null;
}

const EMPTY: RoomChat = {
  messages: [],
  state: 'idle',
  error: null,
  historyError: null,
  nextCursor: null,
  loadingOlder: false,
  sending: false,
  sendError: null,
};

/**
 * ÚNICA fuente de datos del chat. El chat integrado en `/salas/:id` y el apartado `/chats` leen y
 * escriben aquí: mismos mensajes, mismos ids, mismo historial, mismos archivos y mismos no leídos.
 * No guarda nada por su cuenta: toda persistencia pasa por `ChatService` (backend).
 */
@Injectable({ providedIn: 'root' })
export class ChatStore {
  private readonly api = inject(ChatService);
  private readonly files = inject(FilesService);
  private readonly realtime = inject(RealtimeService);
  private readonly user = inject(CurrentUser);

  readonly isDemo = this.api.isDemo;
  readonly conversations = signal<Conversation[]>([]);
  readonly conversationsState = signal<LoadState>('idle');
  readonly conversationsError = signal<string | null>(null);
  readonly unreadTotal = computed(() => this.conversations().reduce((sum, c) => sum + c.unreadCount, 0));

  private readonly rooms = signal<Record<string, RoomChat>>({});
  private epoch = 0;
  private activeRoom: string | null = null;
  private readonly retryIds = new Map<string, { key: string; id: string }>();

  constructor() {
    inject(AuthStore).registerTeardown(() => {
      ++this.epoch;
      this.activeRoom = null;
      this.rooms.set({});
      this.conversations.set([]);
      this.conversationsState.set('idle');
      this.retryIds.clear();
    });
    // Sin servidor real este flujo no emite nada; queda listo para el adaptador de Socket.IO.
    const subscription = this.realtime.events$.subscribe((event) => {
      if (event.type === REALTIME_EVENTS.messageCreated) {
        const message = toMessage(event.message, this.user.profile()?.uid ?? null);
        this.receive(event.roomId, message);
      } else if (event.type === REALTIME_EVENTS.snapshot && this.activeRoom === event.roomId) {
        if (this.chatOf(event.roomId).historyError || this.chatOf(event.roomId).state === 'error')
          void this.open(event.roomId);
        else void this.recover(event.roomId);
      } else if (event.type === REALTIME_EVENTS.roomDeleted) {
        this.patch(event.roomId, {
          state: 'error',
          error: 'La sala fue eliminada',
        });
        this.conversations.update((list) => list.filter((c) => c.roomId !== event.roomId));
      }
    });
    const focus = () => {
      if (this.activeRoom) void this.recover(this.activeRoom);
    };
    window.addEventListener('focus', focus);
    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      window.removeEventListener('focus', focus);
    });
  }

  /** Estado de la conversación de una sala (lee señales: úsalo dentro de `computed` o plantillas). */
  chatOf(roomId: string): RoomChat {
    return this.rooms()[roomId] ?? EMPTY;
  }

  /** `null` si el usuario puede ver la conversación; si no, el motivo (403: no pertenece, 404: no existe). */
  async checkAccess(roomId: string): Promise<string | null> {
    try {
      await firstValueFrom(this.api.getConversation(roomId));
      return null;
    } catch (error) {
      return AppError.from(error).message;
    }
  }

  async loadConversations(): Promise<void> {
    const epoch = this.epoch;
    this.conversationsState.set('loading');
    this.conversationsError.set(null);
    try {
      const result = await firstValueFrom(this.api.listConversations());
      if (epoch !== this.epoch) return;
      this.conversations.set(result);
      this.conversationsState.set('ready');
    } catch (error) {
      if (epoch !== this.epoch) return;
      this.conversationsError.set(AppError.from(error).message);
      this.conversationsState.set('error');
    }
  }

  /** Marca la sala como activa, carga los últimos mensajes si hace falta y los marca como leídos. */
  async open(roomId: string): Promise<void> {
    const epoch = this.epoch;
    this.activeRoom = roomId;
    try {
      if (!this.isDemo) await this.realtime.enter(roomId);
    } catch (error) {
      if (epoch !== this.epoch) return;
      this.patch(roomId, {
        state: 'error',
        error: AppError.from(error).message,
      });
      return;
    }
    if (epoch !== this.epoch) return;
    const current = this.rooms()[roomId];
    if (!current || current.state === 'idle' || current.state === 'error' || current.historyError) {
      this.patch(roomId, { state: 'loading', error: null, historyError: null });
      try {
        if (!this.isDemo) await this.realtime.enter(roomId);
        const page = await firstValueFrom(this.api.listMessages(roomId, { limit: runtimeConfig.chat.pageSize }));
        if (epoch !== this.epoch) return;
        this.patch(roomId, {
          messages: this.merge(this.rooms()[roomId]?.messages ?? [], page.messages),
          nextCursor: page.nextCursor,
          state: 'ready',
          historyError: null,
        });
      } catch (error) {
        if (epoch !== this.epoch) return;
        const live = this.canSend(roomId);
        this.patch(roomId, {
          state: live ? 'ready' : 'error',
          error: live ? null : AppError.from(error).message,
          historyError: live ? AppError.from(error).message : null,
        });
        return;
      }
    }
    if (!this.isDemo) await this.recover(roomId);
    await this.markRead(roomId);
  }

  canSend(roomId: string): boolean {
    return this.isDemo
      ? this.chatOf(roomId).state === 'ready'
      : this.realtime.status() === 'connected' && this.realtime.snapshot()?.roomId === roomId;
  }

  close(roomId: string): void {
    if (this.activeRoom === roomId) {
      this.activeRoom = null;
      this.realtime.leaveRoom(roomId);
    }
  }

  async loadOlder(roomId: string): Promise<void> {
    const epoch = this.epoch;
    const chat = this.rooms()[roomId];
    if (!chat?.nextCursor || chat.loadingOlder) return;
    this.patch(roomId, { loadingOlder: true });
    try {
      const page = await firstValueFrom(
        this.api.listMessages(roomId, {
          before: chat.nextCursor,
          limit: runtimeConfig.chat.pageSize,
        })
      );
      if (epoch !== this.epoch) return;
      const known = new Set(chat.messages.map((m) => m.id));
      this.patch(roomId, {
        messages: this.merge(page.messages, this.rooms()[roomId]?.messages ?? []),
        nextCursor: page.nextCursor,
        loadingOlder: false,
      });
    } catch (error) {
      if (epoch !== this.epoch) return;
      this.patch(roomId, {
        loadingOlder: false,
        historyError: AppError.from(error).message,
      });
    }
  }

  /** Sube los archivos y envía el mensaje. Devuelve `true` si se envió; si falla conserva el borrador. */
  async send(roomId: string, outgoing: OutgoingMessage): Promise<boolean> {
    const epoch = this.epoch;
    const text = outgoing.text.trim();
    if (!text || text.length > 2000 || outgoing.files.length > 0 || this.rooms()[roomId]?.sending) return false;
    this.patch(roomId, { sending: true, sendError: null });
    const key = `${text}|${outgoing.files.map((f) => `${f.name}:${f.size}`).join(',')}`;
    const retry = this.retryIds.get(roomId);
    const clientMessageId = retry?.key === key ? retry.id : crypto.randomUUID();
    this.retryIds.set(roomId, { key, id: clientMessageId });
    try {
      const attachmentIds: string[] = [];
      for (const file of outgoing.files) attachmentIds.push((await firstValueFrom(this.files.upload(file))).id);
      const message = await firstValueFrom(this.api.sendMessage(roomId, { text, attachmentIds, clientMessageId }));
      if (epoch !== this.epoch) return false;
      this.retryIds.delete(roomId);
      this.receive(roomId, message, true);
      this.patch(roomId, { sending: false });
      return true;
    } catch (error) {
      if (epoch !== this.epoch) return false;
      this.patch(roomId, {
        sending: false,
        sendError: AppError.from(error).message,
      });
      return false;
    }
  }

  async markRead(roomId: string): Promise<void> {
    const had = this.conversations().find((c) => c.roomId === roomId)?.unreadCount ?? 0;
    if (this.conversationsState() === 'ready' && had === 0) return;
    try {
      await firstValueFrom(this.api.markRead(roomId));
      this.updateConversation(roomId, (c) => ({ ...c, unreadCount: 0 }));
    } catch {
      /* se reintentará al volver a abrir la conversación */
    }
  }

  fetchFile(attachment: FileAttachment): Promise<Blob> {
    return firstValueFrom(this.files.download(attachment.id));
  }

  /** Integra un mensaje (enviado o recibido) en la conversación y en la lista. */
  private receive(roomId: string, message: ChatMessage, mine = false): void {
    const chat = this.rooms()[roomId];
    if (chat && !chat.messages.some((m) => m.id === message.id))
      this.patch(roomId, { messages: this.merge(chat.messages, [message]) });
    const isActive = this.activeRoom === roomId;
    const found = this.conversations().some((c) => c.roomId === roomId);
    if (!found) {
      void this.loadConversations();
      return;
    }
    this.updateConversation(roomId, (c) => ({
      ...c,
      lastMessage: {
        text: message.text,
        authorName: message.own ? 'Tú' : message.authorName,
        sentAt: message.sentAt,
        hasAttachments: message.attachments.length > 0,
      },
      lastActivityAt: message.sentAt,
      unreadCount: 0,
    }));
    if (!mine && isActive) void this.api.markRead(roomId).subscribe({ error: () => undefined });
  }

  private readonly recovering = new Set<string>();
  private merge(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
    return [...new Map([...a, ...b].map((m) => [m.id, m])).values()].sort(
      (x, y) => x.sentAt.localeCompare(y.sentAt) || x.id.localeCompare(y.id)
    );
  }
  private async recover(roomId: string): Promise<void> {
    if (this.isDemo || this.recovering.has(roomId) || this.chatOf(roomId).state !== 'ready') return;
    this.recovering.add(roomId);
    const epoch = this.epoch;
    try {
      let after = this.chatOf(roomId).messages.slice(-1)[0]?.cursor;
      if (!after) {
        const page = await firstValueFrom(this.api.listMessages(roomId, { limit: runtimeConfig.chat.pageSize }));
        if (epoch !== this.epoch) return;
        this.patch(roomId, {
          messages: this.merge(this.chatOf(roomId).messages, page.messages),
          nextCursor: page.nextCursor,
        });
      } else {
        do {
          const page: MessagePage = await firstValueFrom(this.api.listMessages(roomId, { limit: 100, after }));
          if (epoch !== this.epoch) return;
          this.patch(roomId, {
            messages: this.merge(this.chatOf(roomId).messages, page.messages),
          });
          after = page.nextCursor ?? undefined;
        } while (after && this.activeRoom === roomId);
      }
      if (epoch === this.epoch) this.patch(roomId, { historyError: null });
    } catch (error) {
      if (epoch !== this.epoch) return;
      this.patch(roomId, { historyError: AppError.from(error).message });
    } finally {
      this.recovering.delete(roomId);
    }
  }

  private updateConversation(roomId: string, fn: (c: Conversation) => Conversation): void {
    this.conversations.update((list) =>
      list
        .map((c) => (c.roomId === roomId ? fn(c) : c))
        .sort((a, b) => (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? ''))
    );
  }

  private patch(roomId: string, partial: Partial<RoomChat>): void {
    this.rooms.update((all) => ({
      ...all,
      [roomId]: { ...(all[roomId] ?? EMPTY), ...partial },
    }));
  }
}
