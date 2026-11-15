import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '../../../shared/ui/atoms/icon/icon.component';

let nextId = 0;

/** Tarjeta de Configuración: chip con ícono, título y filas proyectadas (`app-preference-row`). */
@Component({
  selector: 'app-preference-section',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="rounded-[28px] bg-surface-raised p-7 shadow-raised" [attr.aria-labelledby]="titleId">
      <div class="flex items-center gap-4 border-b border-border pb-5">
        <span class="neu-chip h-12 w-12 rounded-2xl bg-primary-soft text-primary"><app-icon [name]="icon()" [size]="24" /></span>
        <h2 [id]="titleId" class="text-[22px] font-medium tracking-tight text-ink">{{ title() }}</h2>
      </div>
      <div class="divide-y divide-border">
        <ng-content />
      </div>
    </section>
  `,
  host: { class: 'block' }
})
export class PreferenceSectionComponent {
  readonly title = input.required<string>();
  readonly icon = input.required<string>();
  protected readonly titleId = `pref-section-${nextId++}`;
}
