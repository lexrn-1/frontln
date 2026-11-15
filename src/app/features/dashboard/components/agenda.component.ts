import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IconComponent } from '../../../shared/ui/atoms/icon/icon.component';
import { EmptyStateComponent } from '../../../shared/ui/molecules/empty-state/empty-state.component';
import { AgendaEntry } from '../store/dashboard.store';

/** "Próximamente": sesiones programadas de las salas del usuario, ordenadas por fecha. */
@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [EmptyStateComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="h-full rounded-[28px] bg-surface-raised p-7 shadow-raised" aria-labelledby="agenda-title">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="eyebrow">Agenda</p>
          <h2 id="agenda-title" class="mt-1.5 text-2xl font-medium tracking-tight text-ink">Próximamente</h2>
        </div>
        <span class="mt-1 text-muted" aria-hidden="true"><app-icon name="calendar_month" [size]="24" /></span>
      </div>

      @if (entries().length) {
        <ul class="mt-6 divide-y divide-border">
          @for (entry of entries(); track entry.id) {
            <li>
              <button type="button" class="flex w-full items-center gap-5 rounded-xl py-4 text-left transition hover:opacity-80" (click)="open.emit(entry.id)">
                <span class="w-12 shrink-0 leading-tight">
                  <span class="block text-sm font-semibold text-ink">{{ entry.time }}</span>
                  <span class="block text-[11px] text-muted">{{ entry.day }}</span>
                </span>
                <span class="min-w-0 flex-1 leading-tight">
                  <span class="block truncate text-sm font-semibold text-ink">{{ entry.title }}</span>
                  <span class="mt-0.5 block truncate text-xs text-muted">{{ entry.subtitle }}</span>
                </span>
                @if (entry.others > 0) {
                  <span class="grid h-8 min-w-8 shrink-0 place-items-center rounded-full bg-ink px-2 text-[11px] font-semibold text-surface-raised">
                    +{{ entry.others }}<span class="sr-only"> participantes más</span>
                  </span>
                }
              </button>
            </li>
          }
        </ul>
      } @else {
        <app-empty-state icon="event_available" title="Sin sesiones próximas" text="Las sesiones programadas de tus salas aparecerán aquí." />
      }
    </section>
  `,
  host: { class: 'block' }
})
export class AgendaComponent {
  readonly entries = input<AgendaEntry[]>([]);
  readonly open = output<string>();
}
