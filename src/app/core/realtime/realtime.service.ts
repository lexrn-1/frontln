import { Injectable, Provider, Signal, signal } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';

import { MessageDto } from '../chat/models/chat.dto';

/**
 * Eventos de tiempo real que el frontend sabe consumir. Los nombres son PROPUESTOS (contrato de
 * Socket.IO pendiente de TS-02; el plan menciona room:join, chat:message, participant:joined…).
 * Al integrar el servidor real basta adaptar este mapa y el adaptador.
 */
export const REALTIME_EVENTS = {
  connected: 'connection.connected',
  disconnected: 'connection.disconnected',
  messageCreated: 'message.created',
  messageUpdated: 'message.updated',
  messageDeleted: 'message.deleted',
  messageRead: 'message.read',
  conversationUpdated: 'conversation.updated',
  participantJoined: 'participant.joined',
  participantLeft: 'participant.left'
} as const;

export type RealtimeEvent =
  | { type: typeof REALTIME_EVENTS.connected }
  | { type: typeof REALTIME_EVENTS.disconnected; reason?: string }
  | { type: typeof REALTIME_EVENTS.messageCreated; roomId: string; message: MessageDto }
  | { type: typeof REALTIME_EVENTS.messageUpdated; roomId: string; message: MessageDto }
  | { type: typeof REALTIME_EVENTS.messageDeleted; roomId: string; messageId: string }
  | { type: typeof REALTIME_EVENTS.messageRead; roomId: string; readerUid: string }
  | { type: typeof REALTIME_EVENTS.conversationUpdated; roomId: string }
  | { type: typeof REALTIME_EVENTS.participantJoined; roomId: string; uid: string; displayName: string }
  | { type: typeof REALTIME_EVENTS.participantLeft; roomId: string; uid: string; displayName: string };

export type RealtimeStatus = 'unavailable' | 'disconnected' | 'connecting' | 'connected';

/**
 * Conexión de tiempo real independiente de los componentes (autenticación con el ID token en el
 * handshake, suscripción por sala, reconexión). Hoy solo existe el adaptador "no conectado":
 * no hay cliente Socket.IO instalado ni ruta pública funcional (EVIDENCE-public-api.md).
 */
export abstract class RealtimeService {
  abstract readonly status: Signal<RealtimeStatus>;
  abstract readonly events$: Observable<RealtimeEvent>;
  abstract connect(): void;
  abstract disconnect(): void;
  abstract joinRoom(roomId: string): void;
  abstract leaveRoom(roomId: string): void;
}

/** PENDIENTE: no abre ninguna conexión ni emite eventos. No simula tiempo real. */
@Injectable()
export class NotConnectedRealtimeService extends RealtimeService {
  readonly status = signal<RealtimeStatus>('unavailable');
  readonly events$: Observable<RealtimeEvent> = EMPTY;
  connect(): void {}
  disconnect(): void {}
  joinRoom(_roomId: string): void {}
  leaveRoom(_roomId: string): void {}
}

export function provideRealtime(): Provider[] {
  return [{ provide: RealtimeService, useClass: NotConnectedRealtimeService }];
}
