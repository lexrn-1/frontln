import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { AvatarComponent } from '../../atoms/avatar/avatar.component';

const TONE_LABELS: Record<string, string> = {
  peach: 'Melocotón',
  mint: 'Menta',
  sky: 'Cielo',
  rose: 'Rosa',
  lavender: 'Lavanda'
};

/** Selector de avatar como grupo de radios nativos (accesible con flechas). */
@Component({
  selector: 'app-avatar-picker',
  standalone: true,
  imports: [AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AvatarPickerComponent), multi: true }
  ],
  template: `
    <fieldset>
      <legend class="mb-1.5 block text-[13px] font-semibold text-ink">{{ legend() }}</legend>
      <div class="flex flex-wrap gap-3.5 pt-1">
        @for (tone of options(); track tone) {
          <label class="cursor-pointer">
            <input
              type="radio"
              class="peer sr-only"
              [name]="groupName()"
              [value]="tone"
              [checked]="value() === tone"
              [disabled]="disabled()"
              (change)="select(tone)"
              (blur)="onTouched()"
            />
            <span
              class="block rounded-full bg-surface-raised p-1 shadow-soft ring-2 ring-transparent transition peer-checked:shadow-pressed peer-checked:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-canvas peer-focus-visible:ring-primary"
            >
              <app-avatar [name]="name() || '?'" [tone]="tone" [size]="40" />
            </span>
            <span class="sr-only">{{ toneLabel(tone) }}</span>
          </label>
        }
      </div>
    </fieldset>
  `,
  host: { class: 'block' }
})
export class AvatarPickerComponent implements ControlValueAccessor {
  readonly options = input.required<readonly string[]>();
  readonly name = input('');
  readonly legend = input('Avatar');
  readonly groupName = input('avatar');

  protected readonly value = signal<string | null>(null);
  protected readonly disabled = signal(false);

  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected select(tone: string): void {
    this.value.set(tone);
    this.onChange(tone);
  }

  protected toneLabel(tone: string): string {
    return `Avatar ${TONE_LABELS[tone] ?? tone}`;
  }
}
