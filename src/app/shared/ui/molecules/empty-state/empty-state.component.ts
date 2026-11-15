import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '../../atoms/icon/icon.component';

/** Estado vacío o de error de una lista; las acciones se proyectan. `tone="error"` usa el acento de error. */
@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col items-center px-6 py-10 text-center" [attr.role]="tone() === 'error' ? 'alert' : 'status'">
      <span class="neu-chip h-12 w-12" [class]="tone() === 'error' ? 'bg-danger-soft text-danger' : 'bg-primary-soft text-primary'">
        <app-icon [name]="icon()" [size]="24" />
      </span>
      <h3 class="mt-4 text-base font-semibold text-ink">{{ title() }}</h3>
      @if (text()) {
        <p class="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">{{ text() }}</p>
      }
      <div class="mt-5 flex flex-wrap justify-center gap-3 empty:hidden">
        <ng-content />
      </div>
    </div>
  `,
  host: { class: 'block' }
})
export class EmptyStateComponent {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly text = input<string | null>(null);
  readonly tone = input<'neutral' | 'error'>('neutral');
}
