import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, map, of, switchMap, tap } from 'rxjs';

import { AppError } from '../../../core/http/app-error';
import { Room, RoomCategory } from '../../../core/rooms/models/room.models';
import { RoomView, toRoomView } from '../../../core/rooms/room.view';
import { RoomsService } from '../../../core/rooms/services/rooms.service';
import { RoomsStore } from '../../../core/rooms/store/rooms.store';

export type ExploreState = 'loading' | 'ready' | 'error';

/**
 * Búsqueda y filtros de "Explorar salas". Reconsulta (con debounce) al cambiar texto o categoría,
 * y cuando el usuario crea, se une o elimina una sala. Una respuesta tardía nunca pisa a una más reciente.
 */
@Injectable()
export class ExploreRoomsStore {
  private readonly api = inject(RoomsService);
  private readonly roomsStore = inject(RoomsStore);

  readonly text = signal('');
  readonly category = signal<RoomCategory | 'all'>('all');
  readonly state = signal<ExploreState>('loading');
  /** `true` mientras hay una consulta en curso (también tras la primera carga). */
  readonly searching = signal(true);
  readonly error = signal<string | null>(null);
  readonly isDemo = this.api.isDemo;
  private readonly rooms = signal<Room[]>([]);
  readonly views = computed<RoomView[]>(() => this.rooms().map((r) => toRoomView(r)));
  readonly hasFilters = computed(() => !!this.text().trim() || this.category() !== 'all');

  private readonly query = computed(() => ({
    text: this.text(),
    category: this.category(),
    revision: this.roomsStore.revision()
  }));
  private retry = signal(0);

  constructor() {
    toObservable(computed(() => ({ ...this.query(), retry: this.retry() })))
      .pipe(
        tap(() => this.searching.set(true)),
        debounceTime(250),
        switchMap((q) =>
          this.api.listAvailable({ text: q.text, category: q.category }).pipe(
            map((rooms) => ({ rooms, error: null as string | null })),
            catchError((error: unknown) => of({ rooms: [] as Room[], error: AppError.from(error).message }))
          )
        ),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe(({ rooms, error }) => {
        this.rooms.set(rooms);
        this.error.set(error);
        this.state.set(error ? 'error' : 'ready');
        this.searching.set(false);
      });
  }

  reload(): void {
    this.state.set('loading');
    this.retry.update((n) => n + 1);
  }

  clearFilters(): void {
    this.text.set('');
    this.category.set('all');
  }
}
