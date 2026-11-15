import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IconComponent } from '../../atoms/icon/icon.component';

/** Datos ya preparados para la tarjeta; la feature los obtiene de su modelo de sala. */
export interface RoomCardView {
  id: string;
  name: string;
  subjectLabel: string;
  /** Símbolo o inicial del ícono ("∫", "B"). */
  initial: string;
  tone: 'rose' | 'mint' | 'lavender' | 'sky' | 'peach';
  participantsLabel: string;
  scheduleLabel: string;
  live: boolean;
  isHost: boolean;
  isMember: boolean;
}

const TONE_CLASSES: Record<RoomCardView['tone'], string> = {
  rose: 'bg-tile-rose text-primary',
  mint: 'bg-tile-mint text-success',
  lavender: 'bg-lavender text-ink',
  sky: 'bg-tile-sky text-ink',
  peach: 'bg-tile-peach text-ink'
};

/** Tarjeta de sala (panel y "Explorar salas"). Solo emite eventos; no conoce servicios ni rutas. */
@Component({
  selector: 'app-room-card',
  standalone: true,
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="flex h-full flex-col rounded-[28px] bg-surface-raised p-6 shadow-raised" [attr.aria-label]="room().name">
      <div class="flex items-start justify-between">
        <span class="neu-chip h-12 w-12 rounded-2xl font-display text-lg font-semibold" [class]="tone()" aria-hidden="true">{{ room().initial }}</span>
        <button
          type="button"
          class="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:text-ink"
          [cdkMenuTriggerFor]="menu"
          [attr.aria-label]="'Más opciones de ' + room().name"
        >
          <app-icon name="more_horiz" [size]="20" />
        </button>
      </div>

      <p class="eyebrow mt-5 !text-[10px]">{{ room().subjectLabel }}</p>
      <h3 class="mt-1.5 text-[18px] font-medium leading-snug text-ink">{{ room().name }}</h3>
      <p class="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted">
        ID <span class="font-display font-bold tracking-wide text-ink">{{ room().id }}</span>
        <button type="button" class="grid h-6 w-6 place-items-center rounded-md text-muted transition hover:text-ink" [attr.aria-label]="'Copiar ID de ' + room().name" (click)="copyCode.emit(room().id)"><app-icon name="content_copy" [size]="14" /></button>
      </p>
      <p class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
        <span class="inline-flex items-center gap-1.5"><app-icon name="group" [size]="16" />{{ room().participantsLabel }}</span>
        <span class="inline-flex items-center gap-1.5" [class.text-primary]="room().live" [class.font-semibold]="room().live">
          <app-icon name="schedule" [size]="16" />{{ room().scheduleLabel }}
        </span>
      </p>

      <div class="neu-groove mt-5"></div>
      <div class="mt-5 flex items-center gap-2.5">
        <button type="button" class="btn-primary h-12 flex-1 rounded-2xl text-[13px]" (click)="enter.emit(room().id)">
          {{ actionLabel() }}
          <app-icon name="arrow_forward" [size]="16" />
          <span class="sr-only">{{ room().name }}</span>
        </button>
        @if (deletable() && room().isHost) {
          <button
            type="button"
            class="neu-chip h-12 w-12 shrink-0 bg-surface-raised text-ink transition active:shadow-pressed"
            [attr.aria-label]="'Eliminar la sala ' + room().name"
            (click)="remove.emit(room().id)"
          >
            <app-icon name="delete" [size]="18" />
          </button>
        }
      </div>
    </article>

    <ng-template #menu>
      <div cdkMenu class="min-w-48 rounded-xl bg-surface-raised p-1.5 shadow-raised" aria-label="Opciones de la sala">
        @if (room().isHost) {
          <button cdkMenuItem type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-surface focus-visible:bg-surface" (click)="edit.emit(room().id)">
            <app-icon name="edit" [size]="16" /> Editar nombre
          </button>
        }
        <button cdkMenuItem type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-surface focus-visible:bg-surface" (click)="copyCode.emit(room().id)">
          <app-icon name="content_copy" [size]="16" /> Copiar código ({{ room().id }})
        </button>
      </div>
    </ng-template>
  `,
  host: { class: 'block' }
})
export class RoomCardComponent {
  readonly room = input.required<RoomCardView>();
  /** Muestra el botón de eliminar (solo para anfitriones). */
  readonly deletable = input(true);
  readonly enter = output<string>();
  readonly remove = output<string>();
  readonly edit = output<string>();
  readonly copyCode = output<string>();

  protected readonly tone = computed(() => TONE_CLASSES[this.room().tone]);
  protected readonly actionLabel = computed(() => {
    const room = this.room();
    if (!room.isMember) return 'Unirme';
    return room.live ? 'Entrar ahora' : 'Ver sala';
  });
}
