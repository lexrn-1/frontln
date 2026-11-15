import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { WeekdayActivity } from '../../../core/study/models/study-stats.models';
import { EmptyStateComponent } from '../../../shared/ui/molecules/empty-state/empty-state.component';
import { SpinnerComponent } from '../../../shared/ui/atoms/spinner/spinner.component';

/** "Tu ritmo de estudio": barras de minutos por día de la semana, con alternativa textual para lectores. */
@Component({
  selector: 'app-weekly-activity',
  standalone: true,
  imports: [EmptyStateComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="h-full rounded-[28px] bg-surface-raised p-7 shadow-raised" aria-labelledby="weekly-title">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="eyebrow">Esta semana</p>
          <h2 id="weekly-title" class="mt-1.5 text-2xl font-medium tracking-tight text-ink">Tu ritmo de estudio</h2>
        </div>
        @if (changePercent() !== null) {
          <span class="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success">
            {{ changePercent()! >= 0 ? '+' : '' }}{{ changePercent() }}%
          </span>
        }
      </div>

      @switch (state()) {
        @case ('loading') {
          <div class="grid h-44 place-items-center text-muted" role="status"><app-spinner [size]="20" /><span class="sr-only">Cargando actividad semanal</span></div>
        }
        @case ('error') {
          <app-empty-state tone="error" icon="cloud_off" title="No pudimos cargar tu actividad" [text]="error()">
            <button type="button" class="btn-ghost h-10" (click)="retry.emit()">Reintentar</button>
          </app-empty-state>
        }
        @default {
          @if (days().length) {
            <div class="mt-8 flex h-56 items-end justify-between gap-2.5" aria-hidden="true">
              @for (day of days(); track day.name; let i = $index) {
                <div class="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <div
                    class="w-full max-w-[36px] rounded-xl transition-all"
                    [class]="i === todayIndex() ? 'bg-primary shadow-primary' : 'bg-surface-raised shadow-soft'"
                    [style.height.%]="barHeight(day.minutes)"
                  ></div>
                  <span class="text-[11px] font-medium text-muted">{{ day.label }}</span>
                </div>
              }
            </div>
            <ul class="sr-only">
              @for (day of days(); track day.name) { <li>{{ day.name }}: {{ day.minutes }} minutos</li> }
            </ul>
            @if (demo()) {
              <p class="mt-3 text-[10px] font-semibold uppercase tracking-wider text-warning">Datos de demostración</p>
            }
          } @else {
            <app-empty-state icon="bar_chart" title="Aún no hay actividad" text="Cuando estudies en una sala, tu ritmo semanal aparecerá aquí." />
          }
        }
      }
    </section>
  `,
  host: { class: 'block' }
})
export class WeeklyActivityComponent {
  readonly days = input<WeekdayActivity[]>([]);
  readonly todayIndex = input(-1);
  readonly changePercent = input<number | null>(null);
  readonly state = input<'idle' | 'loading' | 'ready' | 'error'>('idle');
  readonly error = input<string | null>(null);
  readonly demo = input(false);
  readonly retry = output<void>();

  private readonly max = computed(() => Math.max(1, ...this.days().map((d) => d.minutes)));
  protected barHeight(minutes: number): number {
    return Math.max(8, Math.round((minutes / this.max()) * 86));
  }
}
