import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, input, model, signal } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

export interface SelectOption {
  value: string;
  label: string;
}

let nextId = 0;

/**
 * Lista desplegable propia con estilo neumórfico (patrón "select-only combobox"): botón con
 * `aria-haspopup="listbox"`, opciones `role="option"`, flechas/Inicio/Fin, Enter o Espacio para elegir
 * y Esc para cerrar (sin cerrar el diálogo que la contenga). `value` es de doble vía.
 */
@Component({
  selector: 'app-select',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative" (keydown)="onKey($event)">
      <button
        #trigger
        type="button"
        class="flex h-12 w-full items-center justify-between gap-3 rounded-2xl bg-surface-raised px-4 text-left text-[13px] font-medium text-ink shadow-soft transition active:shadow-pressed"
        aria-haspopup="listbox"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-controls]="isOpen() ? listId : null"
        [attr.aria-label]="label() + ': ' + selectedLabel()"
        [attr.aria-describedby]="describedBy()"
        (click)="toggle()"
      >
        <span class="truncate">{{ selectedLabel() }}</span>
        <app-icon name="expand_more" [size]="20" class="shrink-0 text-muted transition-transform" [class.rotate-180]="isOpen()" />
      </button>

      @if (isOpen()) {
        <ul
          #list
          [id]="listId"
          role="listbox"
          tabindex="-1"
          class="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-auto rounded-2xl bg-surface-raised p-1.5 shadow-raised outline-none"
          [attr.aria-label]="label()"
          [attr.aria-activedescendant]="listId + '-' + active()"
        >
          @for (option of options(); track option.value; let i = $index) {
            <li
              role="option"
              [id]="listId + '-' + i"
              [attr.aria-selected]="option.value === value()"
              class="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-[13px] font-medium"
              [class]="i === active() ? 'bg-primary-soft text-ink' : 'text-ink'"
              (mouseenter)="active.set(i)"
              (click)="choose(option)"
            >
              <span class="truncate">{{ option.label }}</span>
              @if (option.value === value()) { <app-icon name="check" [size]="16" class="text-primary-ink" /> }
            </li>
          }
        </ul>
      }
    </div>
  `,
  host: { class: 'block' }
})
export class SelectComponent {
  readonly options = input.required<SelectOption[]>();
  readonly value = model('');
  readonly label = input.required<string>();
  readonly describedBy = input<string | null>(null);

  protected readonly listId = `select-${nextId++}`;
  protected readonly isOpen = signal(false);
  protected readonly active = signal(0);
  protected readonly selectedLabel = computed(() => this.options().find((o) => o.value === this.value())?.label ?? '');
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: Event): void {
    if (this.isOpen() && !this.host.nativeElement.contains(event.target as Node)) this.isOpen.set(false);
  }

  protected toggle(): void {
    this.isOpen() ? this.close(false) : this.openList();
  }

  private openList(): void {
    const i = this.options().findIndex((o) => o.value === this.value());
    this.active.set(Math.max(0, i));
    this.isOpen.set(true);
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('[role=listbox]')?.focus());
  }

  private close(refocus = true): void {
    this.isOpen.set(false);
    if (refocus) this.host.nativeElement.querySelector<HTMLElement>('button')?.focus();
  }

  protected choose(option: SelectOption): void {
    this.value.set(option.value);
    this.close();
  }

  protected onKey(e: KeyboardEvent): void {
    const last = this.options().length - 1;
    if (!this.isOpen()) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        this.openList();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); this.active.set(Math.min(last, this.active() + 1)); break;
      case 'ArrowUp': e.preventDefault(); this.active.set(Math.max(0, this.active() - 1)); break;
      case 'Home': e.preventDefault(); this.active.set(0); break;
      case 'End': e.preventDefault(); this.active.set(last); break;
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const option = this.options()[this.active()];
        if (option) this.choose(option);
        break;
      }
      case 'Escape':
      case 'Tab':
        // Esc solo cierra la lista: no debe cerrar el modal que la aloja.
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
        }
        this.close(e.key === 'Escape');
        break;
    }
  }
}
