import { runtimeConfig } from '../../../../core/config/runtime-config';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { FileLimits, acceptAttribute, extensionOf, formatBytes, validateFiles } from '../../../utils/file-validation';
import { IconComponent } from '../../atoms/icon/icon.component';
import { SpinnerComponent } from '../../atoms/spinner/spinner.component';

export interface ComposerMessage {
  text: string;
  files: File[];
}

interface Selected {
  file: File;
  /** URL temporal de vista previa (solo imágenes). */
  preview: string | null;
}

/**
 * Campo de redacción con adjuntos: selección múltiple, vista previa, validación (extensión, MIME,
 * tamaño, cantidad), quitar archivos y cancelar la selección. Emite `send`; el borrador solo se
 * borra cuando el padre termina de enviar (`sending` pasa a falso) sin `error`.
 */
@Component({
  selector: 'app-message-composer',
  standalone: true,
  imports: [IconComponent, ReactiveFormsModule, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @if (selected().length) {
        <div class="mb-2 rounded-2xl bg-canvas p-2 shadow-inset">
          <ul class="flex flex-wrap gap-2" aria-label="Archivos para enviar">
            @for (item of selected(); track item.file) {
              <li
                class="flex max-w-full items-center gap-2 rounded-xl bg-surface-raised py-1.5 pl-1.5 pr-1 shadow-soft"
              >
                @if (item.preview) {
                  <img [src]="item.preview" alt="" class="h-9 w-9 shrink-0 rounded-lg object-cover" />
                } @else {
                  <span class="neu-chip h-9 w-9 shrink-0 bg-lavender text-[10px] font-bold uppercase text-ink">{{
                    ext(item.file)
                  }}</span>
                }
                <span class="min-w-0 leading-tight">
                  <span class="block max-w-[10rem] truncate text-xs font-semibold text-ink">{{ item.file.name }}</span>
                  <span class="block text-[11px] text-muted">.{{ ext(item.file) }} · {{ size(item.file.size) }}</span>
                </span>
                <button
                  type="button"
                  class="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:text-ink"
                  [attr.aria-label]="'Quitar ' + item.file.name"
                  [disabled]="sending()"
                  (click)="remove(item)"
                >
                  <app-icon name="close" [size]="16" />
                </button>
              </li>
            }
          </ul>
          <button
            type="button"
            class="mt-2 text-xs font-semibold text-accent underline-offset-2 hover:underline"
            [disabled]="sending()"
            (click)="clearSelection()"
          >
            Cancelar selección
          </button>
        </div>
      }
      @if (issues().length) {
        <ul class="mb-2 space-y-0.5 text-xs font-medium text-danger" role="alert">
          @for (issue of issues(); track issue) {
            <li>{{ issue }}</li>
          }
        </ul>
      }
      <div class="flex items-center gap-2">
        <input
          #picker
          type="file"
          class="sr-only"
          multiple
          tabindex="-1"
          aria-hidden="true"
          [accept]="accept"
          (change)="onPick($event)"
        />
        @if (attachmentsEnabled) {
          <button
            type="button"
            class="neu-chip h-12 w-12 shrink-0 bg-surface-raised text-ink transition active:shadow-pressed"
            aria-label="Adjuntar archivos"
            [disabled]="sending()"
            (click)="picker.click()"
          >
            <app-icon name="attach_file" [size]="20" />
          </button>
        }
        <label class="sr-only" [attr.for]="inputId">Escribe un mensaje</label>
        <input
          [id]="inputId"
          class="input-control h-12 flex-1 rounded-2xl text-[13px]"
          formControlName="text"
          [placeholder]="placeholder()"
          autocomplete="off"
          maxlength="2000"
          [attr.aria-invalid]="error() ? 'true' : null"
          [attr.aria-describedby]="error() ? inputId + '-error' : null"
        />
        <button
          type="submit"
          class="btn-primary h-12 w-12 shrink-0 rounded-2xl !px-0"
          aria-label="Enviar mensaje"
          [disabled]="sending() || disabled()"
        >
          @if (sending()) {
            <app-spinner [size]="14" />
          } @else {
            <app-icon name="send" [size]="20" />
          }
        </button>
      </div>
      @if (error()) {
        <p [id]="inputId + '-error'" class="mt-1.5 text-xs font-medium text-danger" role="alert">
          {{ error() }}
        </p>
      }
    </form>
  `,
  host: { class: 'block' },
})
export class MessageComposerComponent implements OnDestroy {
  readonly limits = input.required<FileLimits>();
  protected readonly attachmentsEnabled = runtimeConfig.features.filesApi;
  readonly sending = input(false);
  readonly disabled = input(false);
  readonly error = input<string | null>(null);
  readonly placeholder = input('Escribe un mensaje…');
  /** Id del campo (distinto si hay dos compositores en pantalla). */
  readonly inputId = `composer-${Math.random().toString(36).slice(2, 8)}`;
  readonly send = output<ComposerMessage>();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    text: [''],
  });
  protected readonly selected = signal<Selected[]>([]);
  protected readonly issues = signal<string[]>([]);
  private readonly picker = viewChild<ElementRef<HTMLInputElement>>('picker');
  private awaiting = false;

  protected get accept(): string {
    return acceptAttribute(this.limits());
  }

  constructor() {
    effect(() => {
      const sending = this.sending();
      const error = this.error();
      untracked(() => {
        if (!sending && this.awaiting) {
          this.awaiting = false;
          if (!error) {
            this.form.controls.text.reset('');
            this.clearSelection();
          }
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.selected().forEach((s) => s.preview && URL.revokeObjectURL(s.preview));
  }

  protected onPick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const { accepted, issues } = validateFiles(Array.from(input.files ?? []), this.selected().length, this.limits());
    this.issues.set(issues);
    this.selected.update((list) => [
      ...list,
      ...accepted.map((file) => ({
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      })),
    ]);
    input.value = '';
  }

  protected remove(item: Selected): void {
    if (item.preview) URL.revokeObjectURL(item.preview);
    this.selected.update((list) => list.filter((s) => s !== item));
    this.issues.set([]);
  }

  protected clearSelection(): void {
    this.selected().forEach((s) => s.preview && URL.revokeObjectURL(s.preview));
    this.selected.set([]);
    this.issues.set([]);
    const el = this.picker()?.nativeElement;
    if (el) el.value = '';
  }

  protected submit(): void {
    const text = this.form.controls.text.value.trim();
    const files = this.selected().map((s) => s.file);
    if (this.disabled() || (!text && files.length === 0) || this.sending()) return;
    this.awaiting = true;
    this.send.emit({ text, files });
  }

  protected ext(file: File): string {
    return extensionOf(file.name) || 'file';
  }
  protected size(bytes: number): string {
    return formatBytes(bytes);
  }
}
