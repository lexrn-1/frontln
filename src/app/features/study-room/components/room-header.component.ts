import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IconComponent } from '../../../shared/ui/atoms/icon/icon.component';

/** Cabecera de la sala: nombre, estado de la sesión, código de invitación y salida. */
@Component({
  selector: 'app-room-header',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="-mx-3 -mt-3 flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:-mx-4 sm:-mt-4 sm:px-5">
      <div class="flex min-w-0 items-center gap-3">
        <button type="button" class="neu-chip h-11 w-11 shrink-0 bg-surface-raised text-ink transition active:shadow-pressed" aria-label="Volver al panel" (click)="back.emit()">
          <app-icon name="chevron_left" [size]="20" />
        </button>
        <div class="min-w-0 leading-tight">
          <p class="eyebrow truncate !text-[10px]">{{ subject() }}</p>
          <h1 class="truncate text-[15px] font-medium text-ink sm:text-[17px]">{{ name() }}</h1>
        </div>
      </div>

      <p
        class="hidden items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold sm:inline-flex"
        [class]="live() ? 'bg-primary-soft text-primary' : 'bg-surface text-muted'"
      >
        <span class="h-1.5 w-1.5 rounded-full" [class]="live() ? 'bg-primary' : 'bg-muted'" aria-hidden="true"></span>
        {{ statusLabel() }}
      </p>

      <div class="flex shrink-0 items-center gap-2">
        <button type="button" class="btn-ghost h-11 gap-2 px-3 font-display text-xs font-bold tracking-wide sm:px-4" (click)="copyCode.emit()" [attr.aria-label]="'Copiar código de invitación ' + code()">
          <app-icon name="content_copy" [size]="18" /> <span class="max-[400px]:sr-only">{{ code() }}</span>
        </button>
        <button type="button" class="neu-chip h-11 w-11 bg-surface-raised text-ink transition active:shadow-pressed" aria-label="Salir de la sala" (click)="leave.emit()">
          <app-icon name="close" [size]="18" />
        </button>
      </div>
    </header>
  `,
  host: { class: 'block' }
})
export class RoomHeaderComponent {
  readonly name = input.required<string>();
  readonly subject = input('');
  readonly code = input.required<string>();
  readonly live = input(false);
  readonly statusLabel = input('');
  readonly back = output<void>();
  readonly leave = output<void>();
  readonly copyCode = output<void>();
}
