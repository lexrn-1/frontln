import { ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { UserProfile, AVATAR_OPTIONS } from '../../../core/auth/models/auth.models';
import { IconComponent } from '../../../shared/ui/atoms/icon/icon.component';
import { SpinnerComponent } from '../../../shared/ui/atoms/spinner/spinner.component';
import { TextInputComponent } from '../../../shared/ui/atoms/text-input/text-input.component';
import { AvatarPickerComponent } from '../../../shared/ui/molecules/avatar-picker/avatar-picker.component';
import { FormFieldComponent } from '../../../shared/ui/molecules/form-field/form-field.component';
import { controlError, focusFirstInvalid } from '../../../shared/utils/form-errors';
import { notBlankValidator, usernameValidator } from '../../../shared/validators/auth.validators';
import { AcademicInfo, UpdateProfileRequest } from '../models/profile.models';

/**
 * Formulario de edición de perfil (US-04). Valida en cliente (mismas reglas que "Completar perfil"),
 * muestra los errores del servidor junto a cada campo y emite `save`/`cancelled`; no hace peticiones.
 */
@Component({
  selector: 'app-profile-form',
  standalone: true,
  imports: [AvatarPickerComponent, FormFieldComponent, IconComponent, ReactiveFormsModule, SpinnerComponent, TextInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="mt-5 space-y-4" aria-label="Editar perfil">
      <div class="grid gap-4 sm:grid-cols-2">
        <app-form-field label="Nombres" forId="pf-nombres" [error]="err('nombres')">
          <app-text-input inputId="pf-nombres" formControlName="nombres" icon="person" autocomplete="given-name" [maxlength]="80" [required]="true" [invalid]="!!err('nombres')" [describedBy]="err('nombres') ? 'pf-nombres-error' : null" />
        </app-form-field>
        <app-form-field label="Apellidos" forId="pf-apellidos" [error]="err('apellidos')">
          <app-text-input inputId="pf-apellidos" formControlName="apellidos" icon="person" autocomplete="family-name" [maxlength]="80" [required]="true" [invalid]="!!err('apellidos')" [describedBy]="err('apellidos') ? 'pf-apellidos-error' : null" />
        </app-form-field>
        <app-form-field label="Nombre de usuario" forId="pf-username" [error]="err('username')" hint="3–20 caracteres: letras, números o guion bajo.">
          <app-text-input inputId="pf-username" formControlName="username" icon="alternate_email" autocomplete="username" [maxlength]="20" [required]="true" [invalid]="!!err('username')" [describedBy]="err('username') ? 'pf-username-error' : 'pf-username-hint'" />
        </app-form-field>
        <app-form-field label="Correo" forId="pf-email" hint="Para cambiar el correo ve a Configuración.">
          <app-text-input inputId="pf-email" [formControl]="emailControl" icon="menu_book" describedBy="pf-email-hint" />
        </app-form-field>
        <app-form-field label="Carrera" forId="pf-career" [optional]="true" [error]="err('career')">
          <app-text-input inputId="pf-career" formControlName="career" icon="menu_book" [maxlength]="120" [invalid]="!!err('career')" [describedBy]="err('career') ? 'pf-career-error' : null" />
        </app-form-field>
        <app-form-field label="Universidad" forId="pf-university" [optional]="true" [error]="err('university')">
          <app-text-input inputId="pf-university" formControlName="university" icon="home" [maxlength]="120" [invalid]="!!err('university')" [describedBy]="err('university') ? 'pf-university-error' : null" />
        </app-form-field>
      </div>

      <app-avatar-picker formControlName="avatar" [options]="avatarOptions" [name]="form.controls.nombres.value" legend="Avatar" groupName="profile-avatar" />

      @if (saveError()) {
        <p class="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger" role="alert">
          <app-icon name="error" [size]="18" class="mt-px" /> <span>{{ saveError() }}</span>
        </p>
      }

      <div class="flex flex-wrap justify-end gap-3 pt-1">
        <button type="button" class="btn-ghost h-10" [disabled]="saving()" (click)="cancelled.emit()">Cancelar</button>
        <button type="submit" class="btn-primary h-10" [disabled]="saving()">
          @if (saving()) { <app-spinner [size]="14" /> <span>Guardando…</span> } @else { <span>Guardar cambios</span> }
        </button>
      </div>
    </form>
  `
})
export class ProfileFormComponent implements OnInit {
  readonly profile = input.required<UserProfile>();
  readonly academic = input<AcademicInfo>({ career: null, university: null });
  readonly saving = input(false);
  readonly saveError = input<string | null>(null);
  readonly fieldErrors = input<Record<string, string>>({});
  readonly save = output<UpdateProfileRequest>();
  readonly cancelled = output<void>();

  protected readonly avatarOptions = AVATAR_OPTIONS;
  protected readonly submitted = signal(false);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly form = this.fb.group({
    nombres: ['', [Validators.required, notBlankValidator(), Validators.maxLength(80)]],
    apellidos: ['', [Validators.required, notBlankValidator(), Validators.maxLength(80)]],
    username: ['', [Validators.required, usernameValidator()]],
    career: ['', [Validators.maxLength(120)]],
    university: ['', [Validators.maxLength(120)]],
    avatar: ['peach']
  });

  /** Solo lectura: el cambio de correo exige reautenticación (Configuración). */
  protected readonly emailControl = new FormControl({ value: '', disabled: true }, { nonNullable: true });

  private readonly messages: Record<string, Record<string, string>> = {
    nombres: { required: 'Escribe tus nombres.', maxlength: 'Máximo 80 caracteres.' },
    apellidos: { required: 'Escribe tus apellidos.', maxlength: 'Máximo 80 caracteres.' },
    username: { required: 'Elige un nombre de usuario.', pattern: 'Usa 3–20 letras, números o guion bajo.' },
    career: { maxlength: 'Máximo 120 caracteres.' },
    university: { maxlength: 'Máximo 120 caracteres.' }
  };

  ngOnInit(): void {
    const p = this.profile();
    const a = this.academic();
    this.form.reset({
      nombres: p.nombres, apellidos: p.apellidos, username: p.username,
      career: a.career ?? '', university: a.university ?? '', avatar: p.avatar
    });
    this.emailControl.setValue(p.email);
  }

  protected err(name: string): string | null {
    const control = this.form.get(name);
    return controlError(control, this.messages[name] ?? {}, this.submitted()) ?? this.fieldErrors()[name] ?? null;
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focusFirstInvalid(this.host.nativeElement);
      return;
    }
    const v = this.form.getRawValue();
    this.save.emit({ ...v, username: v.username.normalize('NFKC').trim() });
  }
}
