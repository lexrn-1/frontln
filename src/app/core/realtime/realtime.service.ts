import { AuthStore } from '../auth/store/auth.store';
import { Injectable, Provider, Signal, signal, inject } from '@angular/core';
import { EMPTY, Observable, Subject, firstValueFrom } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { IdentityProvider } from '../auth/services/identity-provider';
import { runtimeConfig } from '../config/runtime-config';
import { AppError } from '../http/app-error';

import { MessageDto } from '../chat/models/chat.dto';

export const REALTIME_EVENTS = {
  connected: 'connection.connected',
  disconnected: 'connection.disconnected',
  messageCreated: 'message.created',
  messageUpdated: 'message.updated',
  messageDeleted: 'message.deleted',
  messageRead: 'message.read',
  conversationUpdated: 'conversation.updated',
  participantJoined: 'participant.joined',
  participantLeft: 'participant.left',
  snapshot: 'room.snapshot',
  media: 'media.updated',
  signal: 'rtc.signal',
  roomDeleted: 'room.deleted',
  roomUpdated: 'room.updated',
} as const;

export interface LiveParticipant {
  connectionId: string;
  uid: string;
  displayName: string;
  avatar: string;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
}
export interface RoomSnapshot {
  roomId: string;
  connectionId: string;
  name: string;
  ownerUid: string;
  participants: LiveParticipant[];
  maxConnections: number;
}
export type RealtimeEvent =
  | { type: 'room.snapshot'; roomId: string; snapshot: RoomSnapshot }
  | { type: 'media.updated'; roomId: string; participant: LiveParticipant }
  | {
      type: 'rtc.signal';
      roomId: string;
      fromConnectionId: string;
      signal: Record<string, unknown>;
    }
  | { type: 'room.deleted'; roomId: string }
  | { type: 'room.updated'; roomId: string; name: string }
  | { type: typeof REALTIME_EVENTS.connected }
  | { type: typeof REALTIME_EVENTS.disconnected; reason?: string }
  | {
      type: typeof REALTIME_EVENTS.messageCreated;
      roomId: string;
      message: MessageDto;
    }
  | {
      type: typeof REALTIME_EVENTS.messageUpdated;
      roomId: string;
      message: MessageDto;
    }
  | {
      type: typeof REALTIME_EVENTS.messageDeleted;
      roomId: string;
      messageId: string;
    }
  | {
      type: typeof REALTIME_EVENTS.messageRead;
      roomId: string;
      readerUid: string;
    }
  | { type: typeof REALTIME_EVENTS.conversationUpdated; roomId: string }
  | {
      type: typeof REALTIME_EVENTS.participantJoined;
      roomId: string;
      uid: string;
      displayName: string;
      participant?: LiveParticipant;
    }
  | {
      type: typeof REALTIME_EVENTS.participantLeft;
      roomId: string;
      uid: string;
      displayName: string;
      participant?: LiveParticipant;
    };

export type RealtimeStatus = 'unavailable' | 'disconnected' | 'connecting' | 'connected';

export abstract class RealtimeService {
  readonly snapshot = signal<RoomSnapshot | null>(null);
  abstract readonly status: Signal<RealtimeStatus>;
  abstract readonly events$: Observable<RealtimeEvent>;
  abstract connect(): void;
  abstract disconnect(): void;
  abstract joinRoom(roomId: string): void;
  abstract leaveRoom(roomId: string): void;
  async enter(roomId: string): Promise<RoomSnapshot> {
    throw new AppError('unavailable', 'Tiempo real no disponible');
  }
  async request<T>(event: string, roomId: string, payload: object): Promise<T> {
    throw new AppError('unavailable', 'Tiempo real no disponible');
  }
}

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
  return [
    {
      provide: RealtimeService,
      useClass: runtimeConfig.useMocks ? NotConnectedRealtimeService : SocketRealtimeService,
    },
  ];
}

/** Un socket por sesión de navegador; una presencia por conexión, nunca por uid. */
@Injectable()
export class SocketRealtimeService extends RealtimeService {
  readonly status = signal<RealtimeStatus>('disconnected');
  private readonly bus = new Subject<RealtimeEvent>();
  readonly events$ = this.bus.asObservable();
  private readonly identity = inject(IdentityProvider);
  private readonly auth = inject(AuthStore);
  private socket?: Socket;
  private epoch = 0;
  private desired: string | null = null;
  private entering?: { roomId: string; promise: Promise<RoomSnapshot> };
  private connection?: Promise<void>;
  private refresh?: ReturnType<typeof setInterval>;
  constructor() {
    super();
    this.auth.registerTeardown(() => this.disconnect());
    this.identity.user$.subscribe((user) => {
      if (!user) this.disconnect();
    });
  }
  connect(): void {
    void this.ensure().catch(() => undefined);
  }
  private ensure(): Promise<void> {
    if (this.socket?.connected) return Promise.resolve();
    if (this.connection) return this.connection;
    this.status.set('connecting');
    const socket = (this.socket ??= this.create());
    this.connection = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => finish(new AppError('network', 'No se pudo conectar a la sala')), 20000);
      const done = () => finish();
      const failed = () =>
        finish(new AppError('unauthorized', 'No se pudo autenticar la conexión. Reintenta o inicia sesión.'));
      const finish = (error?: AppError) => {
        clearTimeout(timer);
        socket.off('connect', done);
        socket.off('connect_error', failed);
        error ? reject(error) : resolve();
      };
      socket.once('connect', done);
      socket.once('connect_error', failed);
      socket.connect();
    }).finally(() => {
      this.connection = undefined;
    });
    return this.connection;
  }
  private create(): Socket {
    const socket = io(runtimeConfig.realtimeUrl, {
      path: runtimeConfig.socketPath,
      autoConnect: false,
      transports: ['websocket', 'polling'],
      tryAllTransports: true,
      reconnection: true,
      reconnectionDelayMax: 5000,
      auth: (callback) => {
        void firstValueFrom(this.identity.getIdToken(true))
          .then((token) => callback({ token }))
          .catch(() => callback({ token: null }));
      },
    });
    socket.on('connect', () => {
      this.status.set('connected');
      this.bus.next({ type: REALTIME_EVENTS.connected });
      if (this.desired && !this.entering) void this.enter(this.desired).catch(() => undefined);
    });
    socket.on('disconnect', (reason) => {
      this.status.set('disconnected');
      this.snapshot.set(null);
      this.bus.next({ type: REALTIME_EVENTS.disconnected, reason });
      if (reason === 'io server disconnect' && this.desired) {
        // Token fresco en el siguiente handshake; no reutilizar una identidad vencida.
        void firstValueFrom(this.identity.getIdToken(true))
          .then((token) => {
            if (token && this.desired) socket.connect();
          })
          .catch(() => undefined);
      }
    });
    socket.on('session:expired', () => {
      this.desired = null;
      socket.disconnect();
      void this.auth.logout({ reason: 'expired', revokeRemote: false });
    });
    socket.on('connect_error', () => this.status.set('disconnected'));
    const on = (event: string, callback: (roomId: string, payload: any) => void) =>
      socket.on(event, (e) => {
        if (e?.v === 1 && typeof e.roomId === 'string' && e.payload) callback(e.roomId, e.payload);
      });
    on('room:snapshot', (roomId, snapshot) => {
      if (this.desired !== roomId) return;
      this.snapshot.set(snapshot);
      this.bus.next({ type: 'room.snapshot', roomId, snapshot });
    });
    for (const [wire, type] of [
      ['participant:joined', REALTIME_EVENTS.participantJoined],
      ['participant:left', REALTIME_EVENTS.participantLeft],
    ] as const) {
      on(wire, (roomId, p) => {
        this.snapshot.update((snapshot) => {
          if (!snapshot || snapshot.roomId !== roomId) return snapshot;
          const others = snapshot.participants.filter((other) => other.connectionId !== p.participant.connectionId);
          return { ...snapshot, participants: wire === 'participant:joined' ? [...others, p.participant] : others };
        });
        this.bus.next({
          type,
          roomId,
          uid: p.participant.uid,
          displayName: p.participant.displayName,
          participant: p.participant,
        });
      });
    }
    on('media:update', (roomId, p) => {
      this.snapshot.update((snapshot) =>
        snapshot?.roomId === roomId
          ? {
              ...snapshot,
              participants: snapshot.participants.map((other) =>
                other.connectionId === p.participant.connectionId ? p.participant : other
              ),
            }
          : snapshot
      );
      this.bus.next({ type: 'media.updated', roomId, participant: p.participant });
    });
    on('chat:message', (roomId, p) =>
      this.bus.next({
        type: REALTIME_EVENTS.messageCreated,
        roomId,
        message: p.message,
      })
    );
    on('rtc:signal', (roomId, p) =>
      this.bus.next({
        type: 'rtc.signal',
        roomId,
        fromConnectionId: p.fromConnectionId,
        signal: p.signal,
      })
    );
    on('room:updated', (roomId, p) => this.bus.next({ type: 'room.updated', roomId, name: p.name }));
    on('room:deleted', (roomId) => {
      if (this.desired === roomId) this.desired = null;
      this.snapshot.set(null);
      this.bus.next({ type: 'room.deleted', roomId });
    });
    this.refresh = setInterval(
      () => {
        if (this.desired && socket.connected) {
          socket.disconnect();
          socket.connect();
        }
      },
      50 * 60 * 1000
    );
    return socket;
  }
  override async request<T>(event: string, roomId: string, payload: object): Promise<T> {
    await this.ensure();
    return new Promise<T>((resolve, reject) =>
      this.socket!.timeout(15000).emit(event, { v: 1, roomId, payload }, (error: Error | null, ack: any) => {
        if (error) reject(new AppError('network', 'La operación no fue confirmada. Puedes reintentar.'));
        else if (!ack?.ok)
          reject(
            new AppError(ack?.error?.code ?? 'socket', ack?.error?.message ?? 'No se pudo completar la operación')
          );
        else resolve(ack.data as T);
      })
    );
  }
  override async enter(roomId: string): Promise<RoomSnapshot> {
    if (this.entering?.roomId === roomId) return this.entering.promise;
    if (this.snapshot()?.roomId === roomId && this.socket?.connected) return this.snapshot()!;
    this.desired = roomId;
    const epoch = this.epoch;
    const promise = this.request<RoomSnapshot>('room:join', roomId, {})
      .then((snapshot) => {
        if (epoch !== this.epoch || this.desired !== roomId) {
          if (!this.desired && this.socket?.connected)
            void this.request('room:leave', roomId, {}).catch(() => undefined);
          throw new AppError('cancelled', 'Entrada a la sala cancelada');
        }
        // room:snapshot is delivered before the ack. Preserve any participant/media
        // deltas already applied while that acknowledgement was in flight.
        if (this.snapshot()?.connectionId !== snapshot.connectionId) this.snapshot.set(snapshot);
        return this.snapshot()!;
      })
      .catch((error) => {
        if (this.desired === roomId) this.desired = null;
        throw error;
      });
    this.entering = { roomId, promise };
    try {
      return await promise;
    } finally {
      this.entering = undefined;
    }
  }
  joinRoom(roomId: string): void {
    void this.enter(roomId).catch(() => undefined);
  }
  leaveRoom(roomId: string): void {
    if (this.desired !== roomId) return;
    ++this.epoch;
    this.desired = null;
    this.snapshot.set(null);
    if (this.socket?.connected) void this.request('room:leave', roomId, {}).catch(() => undefined);
  }
  disconnect(): void {
    ++this.epoch;
    this.desired = null;
    this.snapshot.set(null);
    clearInterval(this.refresh);
    this.refresh = undefined;
    this.socket?.removeAllListeners();
    this.socket?.disconnect();
    this.socket = undefined;
    this.connection = undefined;
    this.entering = undefined;
    this.status.set('disconnected');
  }
}
