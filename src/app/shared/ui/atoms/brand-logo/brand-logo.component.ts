import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="grid place-items-center rounded-xl bg-surface-raised text-primary shadow-soft" [class]="large() ? 'h-12 w-12 rounded-2xl' : 'h-9 w-9'">
      <app-icon name="menu_book" [size]="large() ? 26 : 20" />
    </span>
    <span class="font-display font-bold tracking-tight text-ink" [class]="large() ? 'text-[24px]' : 'text-[17px]'">
      Study<span class="text-primary">Room</span>
    </span>
  `,
  host: { class: 'inline-flex items-center gap-2.5' }
})
export class BrandLogoComponent {
  /** Versión grande para la barra lateral. */
  readonly large = input(false);
}
