import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { IconComponent } from '../icon/icon.component';

/**
 * Campo de texto con ícono inicial y, para contraseñas, botón de mostrar/ocultar.
 * Se usa con Reactive Forms (`formControlName`). La etiqueta la pone `app-form-field`.
 */
@Component({
  selector: 'app-text-input',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TextInputComponent), multi: true }
  ],
  template: `
    <div class="relative">
      @if (icon()) {
        <app-icon
          class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          [name]="icon()!"
          [size]="18"
        />
      }
      <input
        class="input-control"
        [class.pl-10]="icon()"
        [class.pr-11]="type() === 'password'"
        [id]="inputId()"
        [type]="type() === 'password' && revealed() ? 'text' : type()"
        [attr.name]="name()"
        [attr.placeholder]="placeholder()"
        [attr.autocomplete]="autocomplete()"
        [attr.inputmode]="inputmode()"
        [attr.aria-invalid]="invalid() ? 'true' : null"
        [attr.aria-describedby]="describedBy()"
        [attr.aria-required]="required() ? 'true' : null"
        [attr.maxlength]="maxlength()"
        [value]="value()"
        [disabled]="disabled()"
        spellcheck="false"
        (input)="onInput($event)"
        (blur)="onTouched()"
      />
      @if (type() === 'password') {
        <button
          type="button"
          class="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition hover:text-ink active:shadow-pressed"
          [attr.aria-label]="revealed() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          [attr.aria-pressed]="revealed()"
          [attr.aria-controls]="inputId()"
          (click)="revealed.set(!revealed())"
        >
          <app-icon [name]="revealed() ? 'visibility_off' : 'visibility'" [size]="18" />
        </button>
      }
    </div>
  `,
  host: { class: 'block' }
})
export class TextInputComponent implements ControlValueAccessor {
  readonly inputId = input.required<string>();
  readonly type = input<'text' | 'email' | 'password'>('text');
  readonly name = input<string | null>(null);
  readonly icon = input<string | null>(null);
  readonly placeholder = input<string | null>(null);
  readonly autocomplete = input<string | null>(null);
  readonly inputmode = input<string | null>(null);
  readonly invalid = input(false);
  readonly required = input(false);
  readonly describedBy = input<string | null>(null);
  readonly maxlength = input<number | null>(null);

  protected readonly value = signal('');
  protected readonly disabled = signal(false);
  protected readonly revealed = signal(false);

  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
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

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.value.set(value);
    this.onChange(value);
  }
}
