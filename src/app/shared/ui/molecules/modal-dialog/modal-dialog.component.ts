import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

import { IconComponent } from '../../atoms/icon/icon.component';

let nextId = 0;

/**
 * Modal accesible sobre `<dialog>` nativo: atrapa el foco, cierra con Esc, bloquea el fondo y
 * devuelve el foco al disparador. Se controla con `open`; avisa con `closed` (Esc, X o clic fuera).
 * Con `busy` no se puede cerrar mientras hay una operación en curso.
 */
@Component({
  selector: 'app-modal-dialog',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dlg
      class="modal-dialog"
      [class.modal-wide]="wide()"
      [attr.aria-labelledby]="titleId"
      (cancel)="onCancel($event)"
      (close)="onNativeClose()"
      (click)="onBackdropClick($event)"
    >
      <div class="p-6 sm:p-7">
        <div class="flex items-start justify-between gap-4">
          <div>
            @if (eyebrow()) {
              <p class="eyebrow">{{ eyebrow() }}</p>
            }
            <h2 [id]="titleId" class="mt-1 text-xl font-medium leading-tight text-ink">{{ heading() }}</h2>
          </div>
          <button
            type="button"
            class="neu-chip h-9 w-9 shrink-0 bg-surface-raised text-ink transition active:shadow-pressed"
            aria-label="Cerrar"
            [disabled]="busy()"
            (click)="requestClose()"
          >
            <app-icon name="close" [size]="18" />
          </button>
        </div>
        <ng-content />
      </div>
    </dialog>
  `,
  styles: `
    dialog.modal-dialog {
      margin: auto;
      width: min(28rem, calc(100vw - 2rem));
      max-height: calc(100dvh - 2rem);
      padding: 0;
      border: 0;
      border-radius: 1.5rem;
      overflow: auto;
      color: var(--color-ink);
      background: var(--color-surface-raised);
      box-shadow: 0 24px 70px rgb(60 40 30 / 18%), var(--shadow-soft);
    }
    dialog.modal-dialog.modal-wide {
      width: min(34rem, calc(100vw - 2rem));
    }
    dialog.modal-dialog[open] {
      animation: app-pop-in 200ms var(--ease-out);
    }
    dialog.modal-dialog::backdrop {
      background: rgb(60 50 45 / 32%);
      backdrop-filter: blur(6px);
    }
  `
})
export class ModalDialogComponent {
  readonly open = input(false);
  readonly heading = input.required<string>();
  readonly eyebrow = input<string | null>(null);
  readonly busy = input(false);
  readonly wide = input(false);
  readonly closed = output<void>();

  protected readonly titleId = `modal-title-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dlg');

  constructor() {
    effect(() => {
      const el = this.dialog().nativeElement;
      if (this.open() && !el.open) el.showModal();
      else if (!this.open() && el.open) el.close();
    });
  }

  protected requestClose(): void {
    if (!this.busy()) this.closed.emit();
  }

  protected onCancel(event: Event): void {
    // Esc: se delega en `open` para que el padre decida (y no se cierre con `busy`).
    event.preventDefault();
    this.requestClose();
  }

  protected onNativeClose(): void {
    if (this.open()) this.closed.emit();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement) this.requestClose();
  }
}
