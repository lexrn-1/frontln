import { AuthStore } from '../../../core/auth/store/auth.store';
import { Router } from '@angular/router';
import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CurrentUser } from '../../../core/auth/store/current-user.store';
import { AppError } from '../../../core/http/app-error';
import { Announcer } from '../../../core/layout/announcer.service';
import { REALTIME_EVENTS, RealtimeService } from '../../../core/realtime/realtime.service';
import { Room } from '../../../core/rooms/models/room.models';
import { RoomsService } from '../../../core/rooms/services/rooms.service';
import { RoomsStore } from '../../../core/rooms/store/rooms.store';
import { Participant, StudySession } from '../models/study-room.models';
import { MediaService } from '../services/media.service';
import { PeerConnectionsService } from '../services/peer-connections.service';
import { participantView, StudyRoomService } from '../services/study-room.service';

export type RoomState = 'loading' | 'ready' | 'error';
/** Qué ocupa el escenario principal: la cuadrícula, el tablero o tu pantalla compartida. */
export type Stage = 'grid' | 'board' | 'screen';

@Injectable()
export class StudyRoomStore {
  private readonly rooms = inject(RoomsService);
  private readonly roomsStore = inject(RoomsStore);
  private readonly api = inject(StudyRoomService);
  private readonly user = inject(CurrentUser);
  private readonly media = inject(MediaService);
  private readonly peers = inject(PeerConnectionsService);
  private readonly realtime = inject(RealtimeService);
  private readonly announcer = inject(Announcer);

  readonly isDemo = this.api.isDemo;
  readonly mediaConnected = this.peers.status;
  readonly realtimeStatus = this.realtime.status;
  readonly permission = this.media.permission;
  readonly permissionMessage = this.media.message;
  readonly localStream = this.media.stream;
  readonly remoteStreams = this.peers.remoteStreams;
  private readonly router = inject(Router);

  readonly state = signal<RoomState>('loading');
  readonly error = signal<string | null>(null);
  readonly room = signal<Room | null>(null);
  readonly session = signal<StudySession | null>(null);
  private readonly rawParticipants = signal<Participant[]>([]);

  readonly micOn = signal(false);
  readonly cameraOn = signal(false);
  readonly stage = signal<Stage>('grid');
  readonly screenStream = this.media.screenStream;
  readonly screenMessage = this.media.screenMessage;
  /** En móvil el chat es una hoja que se abre a demanda; en escritorio está a la vista. */
  readonly chatOpen = signal(typeof matchMedia !== 'function' || matchMedia('(min-width: 1024px)').matches);

  private readonly now = signal(Date.now());
  private generation = 0;
  private roomId = '';

  readonly participants = computed<Participant[]>(() => {
    const profile = this.user.profile();
    return this.rawParticipants().map((p) => {
      if (!p.isSelf) return p;
      const base = { ...p, micOn: this.micOn(), camOn: this.cameraOn() };
      if (!profile) return base;
      const lastInitial = profile.apellidos.trim().charAt(0).toUpperCase();
      return {
        ...base,
        fullName: this.user.fullName(),
        label: 'Tú',
        initials: `${profile.nombres.charAt(0)}${lastInitial}`.toUpperCase(),
      };
    });
  });

  readonly elapsed = computed(() => {
    const start = this.session()?.startedAt;
    if (!start) return null;
    const seconds = Math.max(0, Math.floor((this.now() - new Date(start).getTime()) / 1000));
    const h = Math.floor(seconds / 3600);
    const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  });

  constructor() {
    const unregister = inject(AuthStore).registerTeardown(() => this.release());
    // Si el navegador detiene la pantalla ("Dejar de compartir"), el escenario vuelve a la cuadrícula.
    effect(
      () => {
        if (this.stage() === 'screen' && !this.screenStream()) {
          this.peers.setScreen(null);
          this.stage.set('grid');
        }
      },
      { allowSignalWrites: true }
    );
    effect(() => {
      const state = {
        micOn: this.micOn(),
        camOn: this.cameraOn(),
        screenSharing: !!this.screenStream(),
      };
      if (this.state() === 'ready' && !this.isDemo)
        void this.realtime.request('media:update', this.roomId, state).catch(() => undefined);
    });
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    const sub = this.realtime.events$.subscribe((event) => {
      if (!('roomId' in event) || event.roomId !== this.roomId) return;
      if (event.type === 'room.snapshot') {
        this.rawParticipants.set(
          event.snapshot.participants.map((p) => participantView(p, event.snapshot.connectionId))
        );
        void this.publishMedia();
      } else if (
        (event.type === REALTIME_EVENTS.participantJoined || event.type === 'media.updated') &&
        event.participant
      ) {
        const participant = participantView(event.participant, this.realtime.snapshot()?.connectionId ?? '');
        this.rawParticipants.update((list) => [...list.filter((p) => p.id !== participant.id), participant]);
        if (event.type === REALTIME_EVENTS.participantJoined)
          this.announcer.announce(`${participant.fullName} entró a la sala`);
      } else if (event.type === REALTIME_EVENTS.participantLeft) {
        this.rawParticipants.update((list) => list.filter((p) => p.id !== event.participant?.connectionId));
        this.announcer.announce(`${event.displayName} salió de la sala`);
      } else if (event.type === 'room.updated') {
        this.room.update((room) => (room ? { ...room, name: event.name } : room));
      } else if (event.type === 'room.deleted') {
        this.release();
        this.announcer.announce('El anfitrión eliminó la sala');
        void this.router.navigate(['/dashboard']);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      unregister();
      clearInterval(timer);
      sub.unsubscribe();
      this.release();
    });
  }

  async load(roomId: string): Promise<void> {
    const generation = ++this.generation;
    this.roomId = roomId;
    this.state.set('loading');
    this.error.set(null);
    try {
      let room = this.isDemo
        ? await firstValueFrom(this.rooms.getById(roomId))
        : await firstValueFrom(this.rooms.join(roomId));
      if (generation !== this.generation) return;
      // Acceso por enlace directo (US-08): quien tiene sesión y aún no pertenece, se une.
      if (!room.isMember) room = await this.roomsStore.join(room.id);
      this.peers.join(room.id, this.media.stream());
      const [session, participants] = await Promise.all([
        firstValueFrom(this.api.getSession(roomId)),
        firstValueFrom(this.api.getParticipants(roomId)),
      ]);
      if (generation !== this.generation) {
        this.realtime.leaveRoom(roomId);
        this.peers.leave();
        return;
      }
      this.room.set(room);
      this.session.set(session);
      this.rawParticipants.set(participants);
      if (this.isDemo) this.realtime.joinRoom(room.id);
      this.peers.join(room.id, this.media.stream());
      this.state.set('ready');
    } catch (error) {
      if (generation !== this.generation) return;
      const e = AppError.from(error);
      this.error.set(
        e.status === 404 || e.code === 'room-not-found'
          ? 'La sala no existe o ya no está disponible. Revisa el enlace o el código.'
          : e.message
      );
      this.state.set('error');
    }
  }

  /** Pide permiso y arranca la captura local; refleja en los controles lo que realmente se obtuvo. */
  async activateMedia(): Promise<void> {
    const ok = await this.media.request({ audio: true, video: true });
    this.micOn.set(ok && this.media.hasTrack('audio'));
    this.cameraOn.set(ok && this.media.hasTrack('video'));
    if (ok) this.peers.join(this.roomId, this.media.stream());
  }

  async toggleMic(): Promise<void> {
    if (!this.media.hasTrack('audio')) return this.enable('audio');
    const next = !this.micOn();
    this.media.setEnabled('audio', next);
    this.micOn.set(next);
  }

  async toggleCamera(): Promise<void> {
    if (!this.media.hasTrack('video')) return this.enable('video');
    const next = !this.cameraOn();
    this.media.setEnabled('video', next);
    this.cameraOn.set(next);
  }

  /** Pide solo el dispositivo que el usuario activó. */
  private async enable(kind: 'audio' | 'video'): Promise<void> {
    const ok = await this.media.request({
      audio: kind === 'audio',
      video: kind === 'video',
    });
    if (kind === 'audio') this.micOn.set(ok && this.media.hasTrack('audio'));
    else this.cameraOn.set(ok && this.media.hasTrack('video'));
    if (ok) this.peers.join(this.roomId, this.media.stream());
    else if (this.media.message()) this.announcer.announce(this.media.message()!, 'error');
  }

  /** Presenta la pantalla (cierra el tablero) o deja de presentar. */
  async toggleScreen(): Promise<void> {
    if (this.stage() === 'screen') return this.stopScreen();
    if (await this.media.startScreen()) {
      this.stage.set('screen');
      this.peers.setScreen(this.media.screenStream());
      this.announcer.announce('Estás compartiendo tu pantalla');
    } else if (this.media.screenMessage()) {
      this.announcer.announce(this.media.screenMessage()!, 'error');
    }
  }

  stopScreen(): void {
    this.media.stopScreen();
    this.peers.setScreen(null);
    if (this.stage() === 'screen') this.stage.set('grid');
  }

  /** Abre o cierra el tablero en el escenario (deja de compartir pantalla si estaba activa). */
  toggleBoard(): void {
    if (this.stage() === 'board') {
      this.stage.set('grid');
      return;
    }
    if (this.stage() === 'screen') this.stopScreen();
    this.stage.set('board');
  }
  toggleChat(): void {
    this.chatOpen.update((v) => !v);
  }

  /** Detiene cámara y micrófono y cierra conexiones (al salir de la sala o cerrar sesión). */
  release(): void {
    ++this.generation;
    this.media.stop();
    this.stage.set('grid');
    this.peers.leave();
    if (this.roomId) this.realtime.leaveRoom(this.roomId);
    this.micOn.set(false);
    this.cameraOn.set(false);
  }

  private async publishMedia(): Promise<void> {
    if (this.isDemo) return;
    try {
      await this.realtime.request('media:update', this.roomId, {
        micOn: this.micOn(),
        camOn: this.cameraOn(),
        screenSharing: !!this.screenStream(),
      });
    } catch {
      /* conexión en recuperación */
    }
  }
}
