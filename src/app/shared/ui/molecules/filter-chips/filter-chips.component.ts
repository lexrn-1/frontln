import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface FilterChipOption {
  value: string;
  label: string;
}

/** Filtros de selección única (categorías). `value` es de doble vía; cada chip es un botón con `aria-pressed`. */
@Component({
  selector: 'app-filter-chips',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="group" [attr.aria-label]="label()" class="flex flex-wrap gap-3">
      @for (option of options(); track option.value) {
        <button
          type="button"
          class="rounded-full px-5 py-2.5 text-[13px] font-semibold transition"
          [class]="option.value === value() ? 'bg-primary-soft text-primary shadow-pressed' : 'text-muted shadow-soft hover:text-ink'"
          [attr.aria-pressed]="option.value === value()"
          (click)="value.set(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  host: { class: 'block' }
})
export class FilterChipsComponent {
  readonly options = input.required<FilterChipOption[]>();
  readonly value = model<string>('');
  readonly label = input('Filtros');
}
