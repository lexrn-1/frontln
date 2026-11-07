import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Ícono decorativo de Material Symbols. Si transmite significado, usar `label`. */
@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="icon-symbol"
    [style.font-size.px]="size()"
    [attr.aria-hidden]="label() ? null : 'true'"
    [attr.role]="label() ? 'img' : null"
    [attr.aria-label]="label()"
    >{{ name() }}</span
  >`,
  host: { class: 'inline-flex' }
})
export class IconComponent {
  readonly name = input.required<string>();
  readonly size = input(18);
  readonly label = input<string | null>(null);
}
