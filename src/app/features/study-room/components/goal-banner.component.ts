import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '../../../shared/ui/atoms/icon/icon.component';
import { StudyGoal } from '../models/study-room.models';

/** Objetivo actual de estudio con su indicador de progreso. */
@Component({
  selector: 'app-goal-banner',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex items-center gap-3 rounded-2xl bg-surface-raised px-4 py-2.5 shadow-soft sm:px-5 sm:py-3.5" aria-label="Objetivo de estudio">
      <span class="shrink-0 text-primary"><app-icon name="center_focus_strong" [size]="22" /></span>
      @if (goal(); as g) {
        <div class="min-w-0 flex-1">
          <p class="text-[13px] font-semibold text-ink">{{ g.title }}</p>
          <p class="truncate text-xs text-muted">{{ g.detail }}</p>
        </div>
        <div class="flex shrink-0 items-center gap-3 sm:w-36">
          <div
            class="hidden h-2 flex-1 overflow-hidden rounded-full bg-canvas shadow-inset sm:block"
            role="progressbar" aria-label="Progreso del objetivo" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="g.progressPercent"
          >
            <div class="h-full rounded-full bg-primary" [style.width.%]="g.progressPercent"></div>
          </div>
          <span class="text-[13px] font-semibold text-primary">{{ g.progressPercent }}%</span>
        </div>
      } @else {
        <p class="text-xs text-muted">Esta sesión aún no tiene un objetivo definido.</p>
      }
    </section>
  `,
  host: { class: 'block' }
})
export class GoalBannerComponent {
  readonly goal = input<StudyGoal | null>(null);
}
