import { ChangeDetectionStrategy, Component } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="grid h-9 w-9 place-items-center rounded-xl bg-surface-raised text-primary shadow-soft">
      <app-icon name="menu_book" [size]="20" />
    </span>
    <span class="font-display text-[17px] font-bold tracking-tight text-ink">
      Study<span class="text-primary">Room</span>
    </span>
  `,
  host: { class: 'inline-flex items-center gap-2.5' }
})
export class BrandLogoComponent {}
