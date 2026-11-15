import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { SpinnerComponent } from '../../atoms/spinner/spinner.component';
import { ModalDialogComponent } from '../modal-dialog/modal-dialog.component';

/** Confirmación de una acción destructiva o importante, con cancelar y estado de carga. */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ModalDialogComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal-dialog [open]="open()" [heading]="heading()" [eyebrow]="eyebrow()" [busy]="pending()" (closed)="closed.emit()">
      <p class="mt-3 text-[13px] leading-relaxed text-muted">{{ message() }}</p>
      @if (error()) {
        <p class="mt-3 text-xs font-medium text-danger" role="alert">{{ error() }}</p>
      }
      <div class="mt-6 flex justify-end gap-3">
        <button type="button" class="btn-ghost h-10" [disabled]="pending()" (click)="closed.emit()">Cancelar</button>
        <button type="button" class="btn-primary h-10" [disabled]="pending()" (click)="confirmed.emit()">
          @if (pending()) { <app-spinner [size]="14" /> }
          {{ confirmLabel() }}
        </button>
      </div>
    </app-modal-dialog>
  `
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly heading = input.required<string>();
  readonly eyebrow = input<string | null>('StudyRoom');
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirmar');
  readonly pending = input(false);
  readonly error = input<string | null>(null);
  readonly confirmed = output<void>();
  readonly closed = output<void>();
}
