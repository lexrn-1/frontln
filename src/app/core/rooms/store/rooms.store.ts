import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AppError } from '../../http/app-error';
import { CreateRoomRequest, Room, UpdateRoomRequest } from '../models/room.models';
import { RoomsService } from '../services/rooms.service';

export type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/** Salas del usuario: las comparten el panel, la barra lateral y los modales Crear/Unirse. */
@Injectable({ providedIn: 'root' })
export class RoomsStore {
  private readonly api = inject(RoomsService);

  readonly isDemo = this.api.isDemo;
  readonly joinHint = this.api.joinHint;
  private readonly _mine = signal<Room[]>([]);
  readonly mine = this._mine.asReadonly();
  readonly state = signal<LoadState>('idle');
  readonly error = signal<string | null>(null);
  /** Sube cuando el usuario crea, une o elimina una sala: otras listas (Explorar) se recargan. */
  readonly revision = signal(0);
  /** Sesión en curso del usuario, si la hay (activa el acceso "Sala en curso"). */
  readonly liveRoom = computed(() => this._mine().find((r) => r.status === 'live') ?? null);

  async loadMine(): Promise<void> {
    this.state.set('loading');
    this.error.set(null);
    try {
      this._mine.set(await firstValueFrom(this.api.listMine()));
      this.state.set('ready');
    } catch (error) {
      this.error.set(AppError.from(error).message);
      this.state.set('error');
    }
  }

  /** Lanza `AppError` si falla, para que el modal muestre el error junto al campo. */
  async create(request: CreateRoomRequest): Promise<Room> {
    const room = await this.run(() => firstValueFrom(this.api.create(request)));
    this.upsert(room);
    this.revision.update((n) => n + 1);
    return room;
  }

  async join(code: string): Promise<Room> {
    const room = await this.run(() => firstValueFrom(this.api.join(code)));
    this.upsert(room);
    this.revision.update((n) => n + 1);
    return room;
  }

  async update(id: string, request: UpdateRoomRequest): Promise<Room> {
    const room = await this.run(() => firstValueFrom(this.api.update(id, request)));
    this._mine.update((rooms) => rooms.map((r) => (r.id === id ? { ...r, ...room } : r)));
    this.revision.update((n) => n + 1);
    return room;
  }

  async leave(id: string): Promise<void> {
    await this.run(() => firstValueFrom(this.api.leave(id)));
    this._mine.update((rooms) => rooms.filter((r) => r.id !== id));
    this.revision.update((n) => n + 1);
  }

  async remove(id: string): Promise<void> {
    await this.run(() => firstValueFrom(this.api.remove(id)));
    this._mine.update((rooms) => rooms.filter((r) => r.id !== id));
    this.revision.update((n) => n + 1);
  }

  private upsert(room: Room): void {
    this._mine.update((rooms) => [room, ...rooms.filter((r) => r.id !== room.id)]);
  }

  private async run<T>(op: () => Promise<T>): Promise<T> {
    try {
      return await op();
    } catch (error) {
      throw AppError.from(error);
    }
  }
}
