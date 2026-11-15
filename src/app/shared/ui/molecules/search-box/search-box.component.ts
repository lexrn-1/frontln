import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

import { IconComponent } from '../../atoms/icon/icon.component';
import { SpinnerComponent } from '../../atoms/spinner/spinner.component';

let nextId = 0;

/** Buscador con ícono, botón para limpiar e indicador de búsqueda en curso. `value` es de doble vía. */
@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [IconComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative" role="search">
      <label class="sr-only" [attr.for]="inputId">{{ label() }}</label>
      <app-icon name="search" [size]="18" class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
      <input
        class="input-control h-12 rounded-2xl pl-11 pr-11"
        type="search"
        [id]="inputId"
        [placeholder]="placeholder()"
        [value]="value()"
        autocomplete="off"
        spellcheck="false"
        (input)="value.set($any($event.target).value)"
      />
      <span class="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center text-muted">
        @if (busy()) {
          <app-spinner [size]="14" />
        } @else if (value()) {
          <button
            type="button"
            class="grid h-8 w-8 place-items-center rounded-lg transition hover:text-ink"
            aria-label="Borrar búsqueda"
            (click)="value.set('')"
          >
            <app-icon name="close" [size]="16" />
          </button>
        }
      </span>
    </div>
  `,
  host: { class: 'block' }
})
export class SearchBoxComponent {
  readonly value = model('');
  readonly placeholder = input('Buscar…');
  readonly label = input('Buscar');
  readonly busy = input(false);
  protected readonly inputId = `search-box-${nextId++}`;
}
