import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ProgressRingComponent } from '../../../shared/ui/atoms/progress-ring/progress-ring.component';
import { IconComponent } from '../../../shared/ui/atoms/icon/icon.component';
import { NextSession } from '../store/dashboard.store';

const dateFormat = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });

/** Tarjeta principal: próxima sesión con cuenta atrás, o sesión en curso, y meta diaria. */
@Component({
  selector: 'app-next-session-card',
  standalone: true,
  imports: [IconComponent, ProgressRingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="flex flex-col justify-between gap-6 rounded-[32px] bg-gradient-to-r from-tile-peach via-surface-raised to-lavender-soft p-7 shadow-raised sm:flex-row sm:items-center sm:p-12"
      aria-labelledby="next-session-title"
    >
      <div class="min-w-0">
        <p class="eyebrow">{{ today }}</p>
        @if (next(); as session) {
          <h2 id="next-session-title" class="mt-3 text-[32px] font-medium leading-[1.1] tracking-tight text-ink sm:text-[42px]">
            Tu próxima sesión empieza<br />en <span class="text-primary">{{ session.countdown }}.</span>
          </h2>
          <p class="mt-3 text-sm text-muted">
            {{ session.room.name }}
            @if (session.companions > 0) { — con {{ session.companions }} {{ session.companions === 1 ? 'compañero' : 'compañeros' }} }
          </p>
          <button type="button" class="btn-primary mt-6 h-12 rounded-2xl px-6" (click)="prepare.emit(session.room.id)">
            Preparar mi sala <app-icon name="arrow_forward" [size]="16" />
          </button>
        } @else if (live()) {
          <h2 id="next-session-title" class="mt-3 text-[32px] font-medium leading-[1.1] tracking-tight text-ink sm:text-[42px]">
            Tienes una sesión <span class="text-primary">en curso.</span>
          </h2>
          <p class="mt-2 text-[13px] text-muted">{{ live()!.name }}</p>
          <button type="button" class="btn-primary mt-6 h-12 rounded-2xl px-6" (click)="prepare.emit(live()!.id)">
            Volver a la sala <app-icon name="arrow_forward" [size]="16" />
          </button>
        } @else {
          <h2 id="next-session-title" class="mt-3 text-[32px] font-medium leading-[1.1] tracking-tight text-ink sm:text-[42px]">
            Aún no tienes <span class="text-primary">sesiones programadas.</span>
          </h2>
          <p class="mt-2 text-[13px] text-muted">Crea una sala o únete con un código para empezar a estudiar en equipo.</p>
          <button type="button" class="btn-primary mt-6 h-12 rounded-2xl px-6" (click)="create.emit()">
            Crear una sala <app-icon name="add" [size]="16" />
          </button>
        }
      </div>

      @if (todayMinutes() !== null) {
        <div class="shrink-0 self-center text-center sm:pr-4">
          <app-progress-ring [value]="goalPercent()" [display]="todayMinutes()" [size]="176" [stroke]="16" label="Minutos estudiados hoy respecto a tu meta" caption="min hoy" />
          @if (demo()) {
            <p class="mt-2 text-[10px] font-semibold uppercase tracking-wider text-warning">Dato de demostración</p>
          }
        </div>
      }
    </section>
  `,
  host: { class: 'block' }
})
export class NextSessionCardComponent {
  readonly next = input<NextSession | null>(null);
  readonly live = input<{ id: string; name: string } | null>(null);
  readonly todayMinutes = input<number | null>(null);
  readonly goalMinutes = input<number | null>(null);
  protected readonly goalPercent = computed(() => {
    const goal = this.goalMinutes();
    return goal ? ((this.todayMinutes() ?? 0) / goal) * 100 : 0;
  });
  readonly demo = input(false);
  readonly prepare = output<string>();
  readonly create = output<void>();

  protected readonly today = dateFormat.format(new Date()).toUpperCase();
}
