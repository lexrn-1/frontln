import { Component, ElementRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { GoogleMarkComponent } from '../../../../shared/ui/atoms/google-mark/google-mark.component';
import { IconComponent } from '../../../../shared/ui/atoms/icon/icon.component';
import { SpinnerComponent } from '../../../../shared/ui/atoms/spinner/spinner.component';
import { TextInputComponent } from '../../../../shared/ui/atoms/text-input/text-input.component';
import { FormFieldComponent } from '../../../../shared/ui/molecules/form-field/form-field.component';
import { AuthPageComponent } from '../../../../shared/ui/templates/auth-page/auth-page.component';
import { controlError, focusFirstInvalid } from '../../../../shared/utils/form-errors';
import { runtimeConfig } from '../../../config/runtime-config';
import { AppError } from '../../../http/app-error';
import { safeReturnUrl } from '../../../utils/safe-return-url';
import { SessionStatus } from '../../models/auth.models';
import { AuthStore } from '../../store/auth.store';

/** US-03: ingreso con correo o Google. Ruta `/login`. */
@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    AuthPageComponent,
    FormFieldComponent,
    GoogleMarkComponent,
    IconComponent,
    ReactiveFormsModule,
    RouterLink,
    SpinnerComponent,
    TextInputComponent
  ],
  templateUrl: './login-page.component.html'
})
export class LoginPageComponent {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly fb = inject(FormBuilder).nonNullable;

  /** La cuenta de prueba solo existe con la identidad simulada. */
  protected readonly useMocks = !runtimeConfig.useFirebaseAuth;
  protected readonly submitted = signal(false);
  protected readonly pending = signal<'email' | 'google' | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly expired = this.route.snapshot.queryParamMap.get('motivo') === 'expired';
  protected readonly returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

  protected readonly form = this.fb.group({
    email: [this.route.snapshot.queryParamMap.get('email') ?? '', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  protected readonly messages = {
    email: { required: 'Escribe tu correo.', email: 'Introduce un correo válido.' },
    password: { required: 'Escribe tu contraseña.' }
  };

  protected error(name: keyof typeof this.messages): string | null {
    return controlError(this.form.get(name), this.messages[name], this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focusFirstInvalid(this.host.nativeElement);
      return;
    }
    this.pending.set('email');
    try {
      const status = await this.store.login(this.form.getRawValue());
      await this.redirect(status);
    } catch (error) {
      const appError = AppError.from(error);
      // Mensaje genérico: no revela si el correo existe.
      this.formError.set(
        appError.code === 'invalid-credential' ? 'Correo o contraseña incorrectos.' : appError.message
      );
      // Se vacía la contraseña sin marcarla como error: el aviso general ya explica el fallo.
      this.submitted.set(false);
      this.form.controls.password.reset();
    } finally {
      this.pending.set(null);
    }
  }

  protected async google(): Promise<void> {
    this.formError.set(null);
    this.pending.set('google');
    try {
      await this.redirect(await this.store.loginWithGoogle());
    } catch (error) {
      if (AppError.from(error).code !== 'popup-closed') {
        this.formError.set('No pudimos conectar con Google. Inténtalo de nuevo o usa tu correo.');
      }
    } finally {
      this.pending.set(null);
    }
  }

  private redirect(status: SessionStatus): Promise<boolean> {
    if (status === 'incomplete') {
      return this.router.navigate(['/completar-perfil'], {
        queryParams: this.returnUrl ? { returnUrl: this.returnUrl } : {},
        replaceUrl: true
      });
    }
    return this.router.navigateByUrl(safeReturnUrl(this.returnUrl), { replaceUrl: true });
  }
}
