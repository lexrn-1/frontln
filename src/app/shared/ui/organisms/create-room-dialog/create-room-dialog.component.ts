import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { controlError } from '../../../utils/form-errors';
import { ROOM_NAME_MAX_LENGTH, requiredTrimmedValidator } from '../../../validators/room.validators';
import { IconComponent } from '../../atoms/icon/icon.component';
import { SelectComponent, SelectOption } from '../../atoms/select/select.component';
import { SpinnerComponent } from '../../atoms/spinner/spinner.component';
import { TextInputComponent } from '../../atoms/text-input/text-input.component';
import { FormFieldComponent } from '../../molecules/form-field/form-field.component';
import { ModalDialogComponent } from '../../molecules/modal-dialog/modal-dialog.component';

/** Valor del formulario (estructuralmente igual a `CreateRoomRequest` del dominio). */
export interface RoomFormValue {
  name: string;
  category: string;
  schedule: { frequency: 'once' | 'daily' | 'weekly'; time: string; date?: string; weekdays?: number[] } | null;
}

const FREQUENCIES = [
  { value: 'none', label: 'Sin horario' },
  { value: 'once', label: 'Solo una vez' },
  { value: 'daily', label: 'Todos los días' },
  { value: 'weekly', label: 'Días de la semana' }
];
const WEEKDAYS = [
  { i: 0, short: 'L', name: 'lunes' }, { i: 1, short: 'M', name: 'martes' }, { i: 2, short: 'X', name: 'miércoles' },
  { i: 3, short: 'J', name: 'jueves' }, { i: 4, short: 'V', name: 'viernes' }, { i: 5, short: 'S', name: 'sábado' },
  { i: 6, short: 'D', name: 'domingo' }
];

/**
 * Modal para crear una sala (nombre, materia y horario con repetición) o, con `nameOnly`, para
 * editar solo su nombre. Presentacional: valida y emite `submitted`; quien lo aloja llama al
 * backend y devuelve `pending`/`error`.
 */
@Component({
  selector: 'app-create-room-dialog',
  standalone: true,
  imports: [FormFieldComponent, IconComponent, ModalDialogComponent, ReactiveFormsModule, SelectComponent, SpinnerComponent, TextInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal-dialog [open]="open()" [heading]="heading()" eyebrow="StudyRoom" [wide]="!nameOnly()" [busy]="pending()" (closed)="closed.emit()">
      <p class="mt-2 text-[13px] text-muted">
        {{ nameOnly() ? 'Elige un nombre claro para tu sala.' : 'Ponle un nombre, elige la materia y, si quieres, un horario para estudiar.' }}
      </p>
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="mt-6 space-y-6">
        <section class="space-y-4" aria-label="Datos de la sala">
          <app-form-field label="Nombre de la sala" forId="create-room-name" [error]="fieldError()">
            <app-text-input
              inputId="create-room-name" formControlName="name" icon="menu_book" placeholder="Ej. Repaso Física · Parcial" autocomplete="off"
              [maxlength]="maxLength" [required]="true" [invalid]="!!fieldError()" [describedBy]="fieldError() ? 'create-room-name-error' : null"
            />
          </app-form-field>

          @if (!nameOnly()) {
            <div>
              <p class="mb-1.5 text-[13px] font-semibold text-ink">Materia</p>
              <app-select label="Materia de la sala" [options]="categories()" [value]="form.controls.category.value" (valueChange)="form.controls.category.setValue($event)" />
            </div>
          }
        </section>

        @if (!nameOnly()) {
          <fieldset class="neu-well space-y-4 p-4 sm:p-5">
            <legend class="sr-only">Horario</legend>
            <div class="flex items-center justify-between gap-3">
              <p class="text-[13px] font-semibold text-ink" aria-hidden="true">Horario <span class="font-normal text-muted">(opcional)</span></p>
              @if (form.controls.frequency.value !== 'none') { <p class="text-[11px] text-muted">Hora local de tu dispositivo</p> }
            </div>

            <div role="group" aria-label="Frecuencia del horario" class="grid grid-cols-2 gap-1.5 rounded-2xl bg-canvas p-1.5 shadow-inset sm:grid-cols-4">
              @for (f of frequencies; track f.value) {
                <button type="button" class="rounded-xl px-2 py-2.5 text-[12px] font-semibold transition"
                  [class]="form.controls.frequency.value === f.value ? 'bg-surface-raised text-primary-ink shadow-soft' : 'text-muted hover:text-ink'"
                  [attr.aria-pressed]="form.controls.frequency.value === f.value" (click)="setFrequency(f.value)">{{ f.label }}</button>
              }
            </div>

            @if (form.controls.frequency.value !== 'none') {
              <div class="grid gap-4" [class.sm:grid-cols-2]="form.controls.frequency.value === 'once'">
                @if (form.controls.frequency.value === 'once') {
                  <label class="block text-[13px] font-semibold text-ink">Fecha
                    <input type="date" class="input-control mt-1.5" formControlName="date" [min]="today" [attr.aria-invalid]="scheduleError() ? 'true' : null" />
                  </label>
                }
                <label class="block text-[13px] font-semibold text-ink">Hora
                  <input type="time" class="input-control mt-1.5" formControlName="time" [attr.aria-invalid]="scheduleError() ? 'true' : null" />
                </label>
              </div>

              @if (form.controls.frequency.value === 'weekly') {
                <div>
                  <p class="mb-2 text-[13px] font-semibold text-ink">Días</p>
                  <div role="group" aria-label="Días de la semana" class="flex justify-between gap-1.5">
                    @for (d of weekdays; track d.i) {
                      <button type="button" class="h-10 min-w-0 flex-1 rounded-xl text-[13px] font-semibold transition sm:max-w-12"
                        [class]="isDay(d.i) ? 'bg-primary text-white shadow-primary' : 'bg-surface-raised text-muted shadow-soft'"
                        [attr.aria-pressed]="isDay(d.i)" [attr.aria-label]="d.name" (click)="toggleDay(d.i)">{{ d.short }}</button>
                    }
                  </div>
                </div>
              }
            }

            @if (scheduleError()) {
              <p class="flex items-start gap-1 text-xs font-medium text-danger" role="alert"><app-icon name="error" [size]="14" class="mt-px" /> {{ scheduleError() }}</p>
            }
          </fieldset>
        }

        <div class="flex justify-end gap-3">
          <button type="button" class="btn-ghost h-11" [disabled]="pending()" (click)="closed.emit()">Cancelar</button>
          <button type="submit" class="btn-primary h-11 px-6" [disabled]="pending()">
            @if (pending()) {
              <app-spinner [size]="14" /> <span>Guardando…</span>
            } @else {
              <span>{{ submitLabel() }}</span> <app-icon name="arrow_forward" [size]="16" />
            }
          </button>
        </div>
      </form>
    </app-modal-dialog>
  `
})
export class CreateRoomDialogComponent {
  readonly open = input(false);
  readonly pending = input(false);
  /** Error devuelto por la capa de datos (p. ej. nombre repetido o sin conexión). */
  readonly error = input<string | null>(null);
  readonly heading = input('Crear una nueva sala');
  readonly submitLabel = input('Crear sala');
  readonly initialName = input('');
  /** Solo pide el nombre (edición de una sala existente). */
  readonly nameOnly = input(false);
  readonly categories = input<SelectOption[]>([]);
  readonly submitted = output<RoomFormValue>();
  readonly closed = output<void>();

  protected readonly maxLength = ROOM_NAME_MAX_LENGTH;
  protected readonly frequencies = FREQUENCIES;
  protected readonly weekdays = WEEKDAYS;
  protected readonly scheduleError = signal<string | null>(null);
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [requiredTrimmedValidator(), Validators.maxLength(ROOM_NAME_MAX_LENGTH)]],
    category: ['otras'],
    frequency: ['none'],
    time: ['19:00'],
    date: [''],
    weekdays: [[] as number[]]
  });
  private submittedOnce = false;

  protected readonly fieldError = () =>
    controlError(
      this.form.controls.name,
      { required: 'Escribe un nombre para la sala.', maxlength: `Usa como máximo ${ROOM_NAME_MAX_LENGTH} caracteres.` },
      this.submittedOnce
    ) ?? this.error();

  constructor() {
    // `reset` escribe en el signal del campo de texto: requiere permitir escrituras en el efecto.
    effect(
      () => {
        if (this.open()) {
          this.form.reset({ name: this.initialName(), category: this.categories()[0]?.value ?? 'otras', frequency: 'none', time: '19:00', date: '', weekdays: [] });
          this.submittedOnce = false;
          this.scheduleError.set(null);
        }
      },
      { allowSignalWrites: true }
    );
  }

  protected setFrequency(value: string): void {
    this.form.controls.frequency.setValue(value);
    this.scheduleError.set(null);
  }

  protected isDay(i: number): boolean {
    return this.form.controls.weekdays.value.includes(i);
  }

  protected toggleDay(i: number): void {
    const current = this.form.controls.weekdays.value;
    this.form.controls.weekdays.setValue(current.includes(i) ? current.filter((d) => d !== i) : [...current, i].sort());
    this.scheduleError.set(null);
  }

  protected submit(): void {
    this.submittedOnce = true;
    this.form.markAllAsTouched();
    if (this.form.controls.name.invalid || this.pending()) return;
    const v = this.form.getRawValue();
    const name = v.name.trim();
    if (this.nameOnly() || v.frequency === 'none') {
      this.scheduleError.set(null);
      this.submitted.emit({ name, category: v.category, schedule: null });
      return;
    }
    const problem = this.validateSchedule(v);
    this.scheduleError.set(problem);
    if (problem) return;
    this.submitted.emit({
      name,
      category: v.category,
      schedule: {
        frequency: v.frequency as 'once' | 'daily' | 'weekly',
        time: v.time,
        ...(v.frequency === 'once' ? { date: v.date } : {}),
        ...(v.frequency === 'weekly' ? { weekdays: v.weekdays } : {})
      }
    });
  }

  private validateSchedule(v: { frequency: string; time: string; date: string; weekdays: number[] }): string | null {
    if (!v.time) return 'Elige la hora.';
    if (v.frequency === 'once') {
      if (!v.date) return 'Elige la fecha.';
      const [y, m, d] = v.date.split('-').map(Number);
      const [h, min] = v.time.split(':').map(Number);
      if (new Date(y, m - 1, d, h, min) <= new Date()) return 'La fecha y hora deben ser futuras.';
    }
    if (v.frequency === 'weekly' && v.weekdays.length === 0) return 'Elige al menos un día de la semana.';
    return null;
  }
}
