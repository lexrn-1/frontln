import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import Peer from 'simple-peer/simplepeer.min.js';
import type { Instance, SignalData } from 'simple-peer';
import {
  RealtimeService,
  LiveParticipant,
  RoomSnapshot,
  REALTIME_EVENTS,
} from '../../../core/realtime/realtime.service';
import { runtimeConfig } from '../../../core/config/runtime-config';
import { Injectable, Signal, signal, inject, DestroyRef } from '@angular/core';

export type PeerStatus = 'unavailable' | 'idle' | 'connecting' | 'connected';

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

interface Link {
  peer: Instance;
  output: MediaStream;
  tracks: Map<string, MediaStreamTrack>;
}
/** Malla limitada a seis conexiones. Socket.IO transporta únicamente SDP/ICE. */
@Injectable()
export class WebRtcPeerConnectionsService extends PeerConnectionsService {
  readonly status = signal<PeerStatus>('idle');
  readonly remoteStreams = signal<ReadonlyMap<string, MediaStream>>(new Map());
  private readonly realtime = inject(RealtimeService);
  private readonly http = inject(HttpClient);
  private readonly links = new Map<string, Link>();
  private readonly waiting = new Map<string, SignalData[]>();
  private participants: LiveParticipant[] = [];
  private self = '';
  private roomId = '';
  private local: MediaStream | null = null;
  private screen: MediaStream | null = null;
  private ice?: RTCIceServer[];
  private generation = 0;
  constructor() {
    super();
    const subscription = this.realtime.events$.subscribe((event) => {
      if (event.type === REALTIME_EVENTS.disconnected) {
        this.clear();
        this.status.set('connecting');
        return;
      }
      if (!('roomId' in event) || event.roomId !== this.roomId) return;
      if (event.type === 'room.snapshot') this.snapshot(event.snapshot);
      else if (event.type === REALTIME_EVENTS.participantJoined && event.participant) {
        this.participants = [
          ...this.participants.filter((p) => p.connectionId !== event.participant!.connectionId),
          event.participant,
        ];
        this.add(event.participant.connectionId);
      } else if (event.type === REALTIME_EVENTS.participantLeft && event.participant) {
        this.participants = this.participants.filter((p) => p.connectionId !== event.participant!.connectionId);
        this.remove(event.participant.connectionId);
      } else if (event.type === 'rtc.signal') {
        const peer = this.links.get(event.fromConnectionId)?.peer;
        if (peer) peer.signal(event.signal as SignalData);
        else
          this.waiting.set(
            event.fromConnectionId,
            [...(this.waiting.get(event.fromConnectionId) ?? []), event.signal as SignalData].slice(-100)
          );
      } else if (event.type === 'room.deleted') this.leave();
    });
    inject(DestroyRef).onDestroy(() => {
      subscription.unsubscribe();
      this.leave();
    });
  }
  join(roomId: string, local: MediaStream | null): void {
    this.local = local;
    if (this.roomId === roomId) {
      for (const link of this.links.values()) this.updateTracks(link);
      return;
    }
    this.clear();
    this.roomId = roomId;
    const generation = ++this.generation;
    this.status.set('connecting');
    void firstValueFrom(this.http.get<{ iceServers: RTCIceServer[] }>(`${runtimeConfig.apiUrl}/rtc/config`))
      .then((config) => {
        if (generation !== this.generation) return;
        this.ice = config.iceServers;
        const snapshot = this.realtime.snapshot();
        if (snapshot?.roomId === roomId) this.snapshot(snapshot);
      })
      .catch(() => {
        if (generation === this.generation) this.status.set('unavailable');
      });
  }
  private snapshot(snapshot: RoomSnapshot): void {
    if (snapshot.connectionId !== this.self) this.clear();
    this.self = snapshot.connectionId;
    this.participants = snapshot.participants;
    for (const id of this.links.keys()) if (!this.participants.some((p) => p.connectionId === id)) this.remove(id);
    for (const participant of this.participants) this.add(participant.connectionId);
  }
  private add(id: string): void {
    if (!this.ice || !this.self || id === this.self || this.links.has(id)) return;
    const output = new MediaStream();
    const peer = new Peer({
      initiator: this.self.localeCompare(id) < 0,
      trickle: true,
      stream: output,
      config: { iceServers: this.ice },
      offerOptions: { offerToReceiveAudio: true, offerToReceiveVideo: true },
    });
    const link: Link = { peer, output, tracks: new Map() };
    this.links.set(id, link);
    this.updateTracks(link);
    peer.on('signal', (signal) => {
      void this.realtime.request('rtc:signal', this.roomId, { toConnectionId: id, signal }).catch(() => {
        this.status.set('connecting');
      });
    });
    peer.on('stream', (stream) => this.remoteStreams.update((map) => new Map(map).set(id, stream)));
    peer.on('track', (_track, stream) => this.remoteStreams.update((map) => new Map(map).set(id, stream)));
    peer.on('connect', () => this.status.set('connected'));
    peer.on('error', () => {
      this.remove(id);
      this.status.set('unavailable');
    });
    peer.on('close', () => {
      if (this.links.get(id)?.peer === peer) this.remove(id);
    });
    for (const signal of this.waiting.get(id) ?? []) peer.signal(signal);
    this.waiting.delete(id);
  }
  private updateTracks(link: Link): void {
    if (link.peer.destroyed) return;
    const desired = [
      this.local?.getAudioTracks()[0],
      this.screen?.getVideoTracks()[0] ?? this.local?.getVideoTracks()[0],
    ].filter((track): track is MediaStreamTrack => !!track && track.readyState === 'live');
    for (const kind of ['audio', 'video']) {
      const old = link.tracks.get(kind);
      const next = desired.find((t) => t.kind === kind);
      if (old === next) continue;
      try {
        if (old && next) {
          link.peer.replaceTrack(old, next, link.output);
          link.output.removeTrack(old);
          link.output.addTrack(next);
        } else if (old) {
          link.peer.removeTrack(old, link.output);
          link.output.removeTrack(old);
        } else if (next) {
          link.output.addTrack(next);
          link.peer.addTrack(next, link.output);
        }
        if (next) link.tracks.set(kind, next);
        else link.tracks.delete(kind);
      } catch {
        this.status.set('unavailable');
      }
    }
  }
  setScreen(stream: MediaStream | null): void {
    this.screen = stream;
    for (const link of this.links.values()) this.updateTracks(link);
  }
  private remove(id: string): void {
    const link = this.links.get(id);
    this.links.delete(id);
    link?.peer.destroy();
    this.waiting.delete(id);
    this.remoteStreams.update((map) => {
      const next = new Map(map);
      next.delete(id);
      return next;
    });
  }
  private clear(): void {
    for (const id of [...this.links.keys()]) this.remove(id);
    this.waiting.clear();
    this.remoteStreams.set(new Map());
    this.self = '';
  }
  leave(): void {
    ++this.generation;
    this.clear();
    this.roomId = '';
    this.local = null;
    this.screen = null;
    this.ice = undefined;
    this.status.set('idle');
  }
}
