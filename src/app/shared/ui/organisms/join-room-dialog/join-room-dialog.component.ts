import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { controlError } from '../../../utils/form-errors';
import { codeFormatValidator, requiredTrimmedValidator } from '../../../validators/room.validators';
import { IconComponent } from '../../atoms/icon/icon.component';
import { SpinnerComponent } from '../../atoms/spinner/spinner.component';
import { TextInputComponent } from '../../atoms/text-input/text-input.component';
import { FormFieldComponent } from '../../molecules/form-field/form-field.component';
import { ModalDialogComponent } from '../../molecules/modal-dialog/modal-dialog.component';

/**
 * Modal "Unirse a una sala". Presentacional: valida el código con `isValidCode` (el formato lo
 * define quien lo aloja) y emite `submitted`; el padre llama al backend y devuelve `pending`/`error`.
 */
@Component({
  selector: 'app-join-room-dialog',
  standalone: true,
  imports: [FormFieldComponent, IconComponent, ModalDialogComponent, ReactiveFormsModule, SpinnerComponent, TextInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal-dialog [open]="open()" heading="Unirse a una sala" eyebrow="StudyRoom" [busy]="pending()" (closed)="closed.emit()">
      <p class="mt-2 text-[13px] text-muted">Pega el código de invitación que te envió el anfitrión.</p>
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="mt-5">
        <app-form-field label="Código de invitación" forId="join-room-code" [error]="fieldError()" [hint]="hint()">
          <app-text-input
            inputId="join-room-code"
            formControlName="code"
            icon="link"
            placeholder="Ej. SR-84K2"
            autocomplete="off"
            [required]="true"
            [invalid]="!!fieldError()"
            [describedBy]="fieldError() ? 'join-room-code-error' : hint() ? 'join-room-code-hint' : null"
          />
        </app-form-field>
        <div class="mt-6 flex justify-end gap-3">
          <button type="button" class="btn-ghost h-10" [disabled]="pending()" (click)="closed.emit()">Cancelar</button>
          <button type="submit" class="btn-primary h-10" [disabled]="pending()">
            @if (pending()) {
              <app-spinner [size]="14" /> <span>Uniéndome…</span>
            } @else {
              <span>Unirme</span> <app-icon name="arrow_forward" [size]="16" />
            }
          </button>
        </div>
      </form>
    </app-modal-dialog>
  `
})
export class JoinRoomDialogComponent {
  readonly open = input(false);
  readonly pending = input(false);
  readonly error = input<string | null>(null);
  /** Comprobación de formato del código (la aporta la capa que conoce el contrato). */
  readonly isValidCode = input<(raw: string) => boolean>(() => true);
  /** Ayuda opcional bajo el campo (p. ej. un código de prueba en modo demostración). */
  readonly hint = input<string | null>(null);
  readonly submitted = output<string>();
  readonly closed = output<void>();

  protected readonly form = inject(FormBuilder).nonNullable.group({ code: [''] });
  private submittedOnce = false;

  protected readonly fieldError = () =>
    controlError(
      this.form.controls.code,
      { required: 'Escribe el código de invitación.', codeFormat: 'El código no tiene un formato válido. Ejemplo: SR-84K2.' },
      this.submittedOnce
    ) ?? this.error();

  constructor() {
    effect(() => {
      this.form.controls.code.setValidators([requiredTrimmedValidator(), codeFormatValidator(this.isValidCode())]);
      this.form.controls.code.updateValueAndValidity({ emitEvent: false });
    });
    // `reset` escribe en el signal del campo de texto: requiere permitir escrituras en el efecto.
    effect(
      () => {
        if (this.open()) {
          this.form.reset();
          this.submittedOnce = false;
        }
      },
      { allowSignalWrites: true }
    );
  }

  protected submit(): void {
    this.submittedOnce = true;
    this.form.markAllAsTouched();
    if (this.form.invalid || this.pending()) return;
    this.submitted.emit(this.form.controls.code.value.trim());
  }
}
