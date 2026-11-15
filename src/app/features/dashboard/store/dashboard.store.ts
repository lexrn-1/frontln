import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';

import { Room } from '../../../core/rooms/models/room.models';
import { RoomView, toRoomView } from '../../../core/rooms/room.view';
import { RoomsStore } from '../../../core/rooms/store/rooms.store';
import { StudyStatsStore } from '../../../core/study/store/study-stats.store';
import { countdownLabel, scheduleLabel } from '../../../core/utils/schedule-label';

export interface NextSession {
  room: Room;
  countdown: string;
  companions: number;
}

export interface AgendaEntry {
  id: string;
  /** Hora ("18:00") y día ("Hoy", "Mañana", "lun") por separado, como en el diseño. */
  time: string;
  day: string;
  title: string;
  subtitle: string;
  /** Otros participantes además del usuario. */
  others: number;
}

/**
 * Estado derivado del panel. No hace peticiones propias: compone las salas del usuario y las
 * estadísticas (stores de `core`) y calcula próxima sesión, agenda y cuenta atrás.
 */
@Injectable()
export class DashboardStore {
  private readonly roomsStore = inject(RoomsStore);
  private readonly statsStore = inject(StudyStatsStore);

  /** "Ahora", refrescado cada 30 s para mantener la cuenta atrás. */
  private readonly now = signal(new Date());

  readonly state = this.roomsStore.state;
  readonly error = this.roomsStore.error;
  readonly isDemo = this.roomsStore.isDemo || this.statsStore.isDemo;
  readonly stats = this.statsStore.stats;
  readonly statsState = this.statsStore.state;
  readonly statsError = this.statsStore.error;

  readonly roomViews = computed<RoomView[]>(() => this.roomsStore.mine().map((r) => toRoomView(r, this.now())));

  private readonly upcoming = computed(() =>
    this.roomsStore
      .mine()
      .filter((r) => r.status === 'scheduled' && r.startsAt && new Date(r.startsAt) > this.now())
      .sort((a, b) => new Date(a.startsAt!).getTime() - new Date(b.startsAt!).getTime())
  );

  readonly liveRoom = this.roomsStore.liveRoom;

  readonly nextSession = computed<NextSession | null>(() => {
    const room = this.upcoming()[0];
    return room
      ? { room, countdown: countdownLabel(room.startsAt!, this.now()), companions: Math.max(0, room.participantCount - 1) }
      : null;
  });

  readonly agenda = computed<AgendaEntry[]>(() =>
    this.upcoming()
      .slice(0, 4)
      .map((r) => {
        const [day, time] = scheduleLabel(r.startsAt!, this.now()).split(', ');
        const [title, ...rest] = r.name.split(' · ');
        return {
          id: r.id, time, day, title,
          subtitle: rest.join(' · ') || r.subject,
          others: Math.max(0, r.participantCount - 1)
        };
      })
  );

  constructor() {
    const timer = setInterval(() => this.now.set(new Date()), 30_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  reload(): void {
    void this.roomsStore.loadMine();
    void this.statsStore.load(true);
  }
}
