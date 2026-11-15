import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AppError } from '../../core/http/app-error';
import { Announcer } from '../../core/layout/announcer.service';
import { RoomDialogs } from '../../core/layout/room-dialogs.service';
import { ROOM_CATEGORY_LABELS, RoomCategory } from '../../core/rooms/models/room.models';
import { RoomsStore } from '../../core/rooms/store/rooms.store';
import { IconComponent } from '../../shared/ui/atoms/icon/icon.component';
import { EmptyStateComponent } from '../../shared/ui/molecules/empty-state/empty-state.component';
import { FilterChipOption, FilterChipsComponent } from '../../shared/ui/molecules/filter-chips/filter-chips.component';
import { SearchBoxComponent } from '../../shared/ui/molecules/search-box/search-box.component';
import { RoomCardComponent } from '../../shared/ui/organisms/room-card/room-card.component';
import { copyText } from '../../shared/utils/clipboard';
import { ExploreRoomsStore } from './store/explore-rooms.store';

/** Descubrir salas (ruta `/explorar`, dentro del shell): búsqueda, categorías y entrada a una sala. */
@Component({
  selector: 'app-explore-rooms-page',
  standalone: true,
  imports: [EmptyStateComponent, FilterChipsComponent, IconComponent, RoomCardComponent, SearchBoxComponent],
  providers: [ExploreRoomsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-6xl space-y-6">
      @if (store.isDemo) {
        <p class="rounded-xl bg-warning-soft px-4 py-2 text-xs font-medium text-warning" role="note">
          Salas de demostración. El plan de trabajo prevé salas privadas sin catálogo público: este listado queda pendiente del contrato de backend.
        </p>
      }

      <div class="space-y-5 rounded-[28px] bg-surface-raised p-5 shadow-soft">
      <div class="flex flex-col gap-3 sm:flex-row">
        <app-search-box
          class="flex-1"
          [(value)]="store.text"
          [busy]="store.searching() && store.state() !== 'loading'"
          label="Buscar salas por materia o tema"
          placeholder="Buscar por materia o tema…"
        />
        <button type="button" class="btn-primary h-12 shrink-0 rounded-2xl px-6" (click)="dialogs.openCreate()">
          <app-icon name="add" [size]="18" /> Crear sala
        </button>
      </div>

      <app-filter-chips [options]="categories" [value]="store.category()" (valueChange)="setCategory($event)" label="Filtrar por categoría" />
      </div>

      <section aria-labelledby="available-title">
        <div class="flex items-end justify-between gap-3">
          <div>
            <p class="eyebrow">Comunidad</p>
            <h2 id="available-title" class="mt-1 text-xl font-medium text-ink">Salas disponibles</h2>
          </div>
          @if (store.state() === 'ready') {
            <p class="text-xs text-muted" aria-live="polite">{{ store.views().length === 1 ? '1 resultado' : store.views().length + ' resultados' }}</p>
          }
        </div>

        <div class="mt-4">
          @switch (store.state()) {
            @case ('loading') {
              <ul class="grid gap-5 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Cargando salas">
                @for (n of skeletons; track n) { <li class="h-[220px] animate-pulse rounded-3xl bg-skeleton"></li> }
              </ul>
            }
            @case ('error') {
              <div class="surface-card">
                <app-empty-state tone="error" icon="cloud_off" title="No pudimos cargar las salas" [text]="store.error()">
                  <button type="button" class="btn-ghost h-10" (click)="store.reload()">Reintentar</button>
                </app-empty-state>
              </div>
            }
            @default {
              @if (store.views().length) {
                <ul class="grid gap-5 transition-opacity md:grid-cols-2 xl:grid-cols-3" [class.opacity-60]="store.searching()">
                  @for (room of store.views(); track room.id) {
                    <li>
                      <app-room-card [room]="room" (enter)="enter($event)" (remove)="remove($event)" (edit)="editRoom($event)" (copyCode)="copyCode($event)" />
                    </li>
                  }
                </ul>
              } @else {
                <div class="surface-card">
                  @if (store.hasFilters()) {
                    <app-empty-state icon="search_off" title="Sin resultados" text="No encontramos salas con esa búsqueda. Prueba con otra materia o quita los filtros.">
                      <button type="button" class="btn-ghost h-10" (click)="store.clearFilters()">Quitar filtros</button>
                    </app-empty-state>
                  } @else {
                    <app-empty-state icon="meeting_room" title="Todavía no hay salas disponibles" text="Sé el primero: crea una sala e invita a tu grupo.">
                      <button type="button" class="btn-primary h-10" (click)="dialogs.openCreate()">Crear sala</button>
                    </app-empty-state>
                  }
                </div>
              }
            }
          }
        </div>
      </section>
    </div>
  `
})
export class ExploreRoomsPageComponent {
  protected readonly store = inject(ExploreRoomsStore);
  protected readonly dialogs = inject(RoomDialogs);
  private readonly rooms = inject(RoomsStore);
  private readonly router = inject(Router);
  private readonly announcer = inject(Announcer);

  protected readonly skeletons = [1, 2, 3];
  protected readonly categories: FilterChipOption[] = [
    { value: 'all', label: 'Todas' },
    ...(['programacion', 'matematicas', 'ciencias', 'literatura', 'derecho', 'idiomas'] as RoomCategory[]).map((value) => ({
      value,
      label: ROOM_CATEGORY_LABELS[value]
    }))
  ];
  private readonly joining = signal(false);

  protected setCategory(value: string): void {
    this.store.category.set(value as RoomCategory | 'all');
  }

  /** Miembro: entra directo. No miembro: se une y luego entra. */
  protected async enter(id: string): Promise<void> {
    const room = this.store.views().find((r) => r.id === id);
    if (!room || this.joining()) return;
    if (!room.isMember) {
      this.joining.set(true);
      try {
        await this.rooms.join(id);
      } catch (error) {
        this.announcer.announce(AppError.from(error).message, 'error');
        return;
      } finally {
        this.joining.set(false);
      }
    }
    await this.router.navigate(['/salas', id]);
  }

  protected remove(id: string): void {
    const room = this.store.views().find((r) => r.id === id);
    if (room) this.dialogs.openRemove({ id, name: room.name });
  }

  protected editRoom(id: string): void {
    const room = this.store.views().find((r) => r.id === id);
    if (room) this.dialogs.openEdit({ id, name: room.name });
  }

  protected async copyCode(id: string): Promise<void> {
    if (await copyText(id)) this.announcer.announce(`Código ${id} copiado`);
    else this.announcer.announce('No pudimos copiar el código. Cópialo manualmente.', 'error');
  }
}
