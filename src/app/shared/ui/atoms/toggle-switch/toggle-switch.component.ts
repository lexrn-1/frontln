import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/** Interruptor neumórfico (`role="switch"`). `checked` es de doble vía; `label` es su nombre accesible. */
@Component({
  selector: 'app-toggle-switch',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="switch"
      class="relative h-8 w-14 shrink-0 rounded-full transition-all"
      [class]="checked() ? 'bg-gradient-to-r from-primary to-danger-warm shadow-primary' : 'bg-canvas shadow-inset'"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
      [attr.aria-describedby]="describedBy()"
      (click)="checked.set(!checked())"
    >
      <span
        class="absolute top-1 h-6 w-6 rounded-full bg-white shadow-soft transition-all"
        [class]="checked() ? 'left-7' : 'left-1'"
        aria-hidden="true"
      ></span>
    </button>
  `,
  host: { class: 'inline-flex' }
})
export class ToggleSwitchComponent {
  readonly checked = model(false);
  readonly label = input.required<string>();
  readonly describedBy = input<string | null>(null);
}
