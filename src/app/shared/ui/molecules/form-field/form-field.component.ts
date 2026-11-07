import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '../../atoms/icon/icon.component';

/**
 * Etiqueta + control proyectado + error o ayuda. El control debe referenciar
 * `{{ forId }}-error` / `{{ forId }}-hint` en `aria-describedby`.
 */
@Component({
  selector: 'app-form-field',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="mb-1.5 block text-[13px] font-semibold text-ink" [attr.for]="forId()">
      {{ label() }}
      @if (optional()) {
        <span class="font-normal text-muted">(opcional)</span>
      }
    </label>
    <ng-content />
    @if (error()) {
      <p class="mt-1.5 flex items-start gap-1 text-xs font-medium text-danger" [id]="forId() + '-error'">
        <app-icon name="error" [size]="14" class="mt-px" />
        <span>{{ error() }}<ng-content select="[fieldErrorAction]" /></span>
      </p>
    } @else if (hint()) {
      <p class="mt-1.5 text-xs text-muted" [id]="forId() + '-hint'">{{ hint() }}</p>
    }
  `,
  host: { class: 'block' }
})
export class FormFieldComponent {
  readonly label = input.required<string>();
  readonly forId = input.required<string>();
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);
  readonly optional = input(false);
}
