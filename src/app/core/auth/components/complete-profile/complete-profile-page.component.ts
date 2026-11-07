import { Component, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { IconComponent } from '../../../../shared/ui/atoms/icon/icon.component';
import { SpinnerComponent } from '../../../../shared/ui/atoms/spinner/spinner.component';
import { TextInputComponent } from '../../../../shared/ui/atoms/text-input/text-input.component';
import { AvatarPickerComponent } from '../../../../shared/ui/molecules/avatar-picker/avatar-picker.component';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';
import { AuthPageComponent } from '../../../../shared/ui/templates/auth-page/auth-page.component';
import { controlError, focusFirstInvalid } from '../../../../shared/utils/form-errors';
import { USERNAME_PATTERN, notBlankValidator } from '../../../../shared/validators/auth.validators';
import { AppError } from '../../../http/app-error';
import { safeReturnUrl } from '../../../utils/safe-return-url';
import { AVATAR_OPTIONS } from '../../models/auth.models';
import { AuthStore } from '../../store/auth.store';
import { trackUsernameAvailability } from '../username-availability';

/**
 * US-02: primer acceso (Google o registro interrumpido). Obliga a elegir username.
 * Un perfil incompleto solo puede completar el perfil o cerrar sesión. Ruta `/completar-perfil`.
 */
@Component({
  selector: 'app-complete-profile-page',
  standalone: true,
  imports: [
    AuthPageComponent,
    AvatarPickerComponent,
    FormFieldComponent,
    IconComponent,
    ReactiveFormsModule,
    SpinnerComponent,
    TextInputComponent
  ],
  templateUrl: './complete-profile-page.component.html'
})
export class CompleteProfilePageComponent {
  protected readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly avatarOptions = AVATAR_OPTIONS;
  protected readonly submitted = signal(false);
  protected readonly pending = signal(false);
  protected readonly formError = signal<string | null>(null);

  private readonly draft = this.store.draft();

  protected readonly form = this.fb.group({
    nombres: [this.draft?.nombres ?? '', [Validators.required, notBlankValidator(), Validators.maxLength(60)]],
    apellidos: [this.draft?.apellidos ?? '', [Validators.required, notBlankValidator(), Validators.maxLength(60)]],
    username: [this.draft?.username ?? '', [Validators.required, Validators.pattern(USERNAME_PATTERN)]],
    avatar: [this.draft?.avatar ?? 'peach', [Validators.required]]
  });

  protected readonly usernameState = trackUsernameAvailability(this.form.controls.username);

  protected readonly messages = {
    nombres: { required: 'Escribe tus nombres.', maxlength: 'Máximo 60 caracteres.' },
    apellidos: { required: 'Escribe tus apellidos.', maxlength: 'Máximo 60 caracteres.' },
    username: {
      required: 'Elige un nombre de usuario para continuar.',
      pattern: 'De 3 a 20 caracteres: minúsculas, números, punto o guion bajo. Empieza por una letra.',
      taken: 'Este nombre de usuario ya está en uso. Prueba con otro.'
    }
  };

  constructor() {
    // Si venimos de un registro con username ocupado, se señala el campo desde el inicio.
    if (this.draft?.username) {
      this.form.controls.username.setErrors({ taken: true });
      this.form.controls.username.markAsTouched();
    }
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focusFirstInvalid(this.host.nativeElement);
      return;
    }
    this.pending.set(true);
    try {
      const value = this.form.getRawValue();
      await this.store.completeProfile({ ...value, username: value.username.trim().toLowerCase() });
      await this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')), {
        replaceUrl: true
      });
    } catch (error) {
      const appError = AppError.from(error);
      if (appError.code === 'username-taken' || appError.status === 409) {
        this.form.controls.username.setErrors({ taken: true });
        focusFirstInvalid(this.host.nativeElement);
      } else {
        this.formError.set(appError.message);
      }
    } finally {
      this.pending.set(false);
    }
  }

  protected logout(): void {
    void this.store.logout();
  }
}
