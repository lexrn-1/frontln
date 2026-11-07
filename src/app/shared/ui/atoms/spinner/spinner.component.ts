import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    class="inline-block animate-spin rounded-full border-2 border-current border-r-transparent"
    [style.width.px]="size()"
    [style.height.px]="size()"
    aria-hidden="true"
  ></span>`,
  host: { class: 'inline-flex' }
})
export class SpinnerComponent {
  readonly size = input(16);
}
