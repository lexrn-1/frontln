import { Component, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { IconComponent } from '../../../../shared/ui/atoms/icon/icon.component';
import { GoogleMarkComponent } from '../../../../shared/ui/atoms/google-mark/google-mark.component';
import { SpinnerComponent } from '../../../../shared/ui/atoms/spinner/spinner.component';
import { TextInputComponent } from '../../../../shared/ui/atoms/text-input/text-input.component';
import { AvatarPickerComponent } from '../../../../shared/ui/molecules/avatar-picker/avatar-picker.component';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';
import { PasswordChecklistComponent } from '../../../../shared/ui/molecules/password-checklist/password-checklist.component';
import { AuthPageComponent } from '../../../../shared/ui/templates/auth-page/auth-page.component';
import { controlError, focusFirstInvalid } from '../../../../shared/utils/form-errors';
import {
  USERNAME_PATTERN,
  institutionalEmailValidator,
  matchFieldsValidator,
  notBlankValidator,
  passwordPolicyValidator
} from '../../../../shared/validators/auth.validators';
import { runtimeConfig } from '../../../config/runtime-config';
import { AppError } from '../../../http/app-error';
import { safeReturnUrl } from '../../../utils/safe-return-url';
import { AVATAR_OPTIONS } from '../../models/auth.models';
import { AuthStore } from '../../store/auth.store';
import { trackUsernameAvailability } from '../username-availability';

/** US-01 (registro con correo) y entrada a US-02 (Google). Ruta `/registro`. */
@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [
    AuthPageComponent,
    AvatarPickerComponent,
    FormFieldComponent,
    GoogleMarkComponent,
    IconComponent,
    PasswordChecklistComponent,
    ReactiveFormsModule,
    RouterLink,
    SpinnerComponent,
    TextInputComponent
  ],
  templateUrl: './register-page.component.html'
})
export class RegisterPageComponent {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly avatarOptions = AVATAR_OPTIONS;
  protected readonly submitted = signal(false);
  protected readonly pending = signal<'email' | 'google' | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly emailInUse = signal(false);

  protected readonly form = this.fb.group(
    {
      nombres: ['', [Validators.required, notBlankValidator(), Validators.maxLength(60)]],
      apellidos: ['', [Validators.required, notBlankValidator(), Validators.maxLength(60)]],
      username: ['', [Validators.required, Validators.pattern(USERNAME_PATTERN)]],
      email: [
        '',
        [Validators.required, Validators.email, institutionalEmailValidator(runtimeConfig.institutionalDomains)]
      ],
      password: ['', [Validators.required, passwordPolicyValidator()]],
      confirmPassword: ['', [Validators.required]],
      avatar: ['peach', [Validators.required]],
      terms: [false, [Validators.requiredTrue]]
    },
    { validators: matchFieldsValidator('password', 'confirmPassword') }
  );

  protected readonly usernameState = trackUsernameAvailability(this.form.controls.username);

  protected readonly messages = {
    nombres: { required: 'Escribe tus nombres.', maxlength: 'Máximo 60 caracteres.' },
    apellidos: { required: 'Escribe tus apellidos.', maxlength: 'Máximo 60 caracteres.' },
    username: {
      required: 'Elige un nombre de usuario.',
      pattern: 'De 3 a 20 caracteres: minúsculas, números, punto o guion bajo. Empieza por una letra.',
      taken: 'Este nombre de usuario ya está en uso.'
    },
    email: {
      required: 'Escribe tu correo universitario.',
      email: 'Introduce un correo válido.',
      institutional: 'Usa tu correo institucional (por ejemplo, nombre@universidad.edu).',
      inUse: 'Ya existe una cuenta con este correo.'
    },
    password: { required: 'Crea una contraseña.', passwordPolicy: 'La contraseña no cumple todos los requisitos.' },
    confirmPassword: { required: 'Repite tu contraseña.', mismatch: 'Las contraseñas no coinciden.' },
    terms: { required: 'Debes aceptar los términos para continuar.' }
  };

  constructor() {
    this.form.controls.email.valueChanges.subscribe(() => this.emailInUse.set(false));
  }

  protected error(name: keyof typeof this.messages): string | null {
    return controlError(this.form.get(name), this.messages[name], this.submitted());
  }

  protected get fullName(): string {
    const { nombres, apellidos } = this.form.getRawValue();
    return `${nombres} ${apellidos}`.trim();
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.formError.set(null);
    if (this.form.invalid || this.usernameState() === 'taken') {
      this.form.markAllAsTouched();
      focusFirstInvalid(this.host.nativeElement);
      return;
    }

    const { confirmPassword: _c, terms: _t, ...data } = this.form.getRawValue();
    this.pending.set('email');
    try {
      await this.store.register({ ...data, email: data.email.trim(), username: data.username.trim().toLowerCase() });
      await this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')), {
        replaceUrl: true
      });
    } catch (error) {
      this.handleError(AppError.from(error));
    } finally {
      this.pending.set(null);
    }
  }

  protected async google(): Promise<void> {
    this.formError.set(null);
    this.pending.set('google');
    try {
      const status = await this.store.loginWithGoogle();
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      await this.router.navigate([status === 'incomplete' ? '/completar-perfil' : safeReturnUrl(returnUrl)], {
        queryParams: status === 'incomplete' && returnUrl ? { returnUrl } : {},
        replaceUrl: true
      });
    } catch (error) {
      const appError = AppError.from(error);
      if (appError.code !== 'popup-closed') {
        this.formError.set('No pudimos conectar con Google. Inténtalo de nuevo o usa tu correo.');
      }
    } finally {
      this.pending.set(null);
    }
  }

  private handleError(error: AppError): void {
    if (error.code === 'email-already-in-use') {
      this.emailInUse.set(true);
      this.form.controls.email.markAsTouched();
      focusFirstInvalid(this.host.nativeElement);
      return;
    }
    if (error.code === 'username-taken' || error.status === 409) {
      if (this.store.status() === 'incomplete') {
        // La cuenta se creó pero el perfil no: se continúa en completar perfil con los datos conservados.
        void this.router.navigate(['/completar-perfil'], { replaceUrl: true });
        return;
      }
      this.form.controls.username.setErrors({ taken: true });
      focusFirstInvalid(this.host.nativeElement);
      return;
    }
    this.formError.set(error.message);
  }
}
