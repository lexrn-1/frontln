import { Injectable, Signal, signal } from '@angular/core';

export type PeerStatus = 'unavailable' | 'idle' | 'connecting' | 'connected';

/**
 * Malla de conexiones WebRTC con los demás participantes (US-12/US-13, TS-03). PENDIENTE: requiere
 * señalización por Socket.IO (`rtc:signal`) y `GET /rtc/config` (STUN/TURN), aún no publicados.
 * WebSocket solo señaliza; el audio/vídeo viaja por WebRTC. Hoy el adaptador no conecta nada y
 * `remoteStreams` queda vacío: no se simulan videollamadas.
 */
export abstract class PeerConnectionsService {
  abstract readonly status: Signal<PeerStatus>;
  /** Streams remotos por id de participante. */
  abstract readonly remoteStreams: Signal<ReadonlyMap<string, MediaStream>>;
  abstract join(roomId: string, local: MediaStream | null): void;
  /** Reemplaza la pista de vídeo por la pantalla (o la restaura con `null`) en todos los pares. */
  abstract setScreen(stream: MediaStream | null): void;
  abstract leave(): void;
}

@Injectable()
export class NotConnectedPeerConnectionsService extends PeerConnectionsService {
  readonly status = signal<PeerStatus>('unavailable');
  readonly remoteStreams = signal<ReadonlyMap<string, MediaStream>>(new Map());
  join(_roomId: string, _local: MediaStream | null): void {}
  setScreen(_stream: MediaStream | null): void {}
  leave(): void {}
}
