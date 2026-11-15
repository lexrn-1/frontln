import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AppError } from '../../../core/http/app-error';
import { ChangeEmailRequest, SettingsService } from '../services/settings.service';

/** Estado de Configuración: cambio de correo con reautenticación. */
@Injectable()
export class SettingsStore {
  private readonly api = inject(SettingsService);

  readonly isDemo = this.api.isDemo;
  readonly pending = signal(false);
  readonly error = signal<string | null>(null);
  /** Correo nuevo en espera de verificación, si el cambio se inició. */
  readonly verificationSentTo = signal<string | null>(null);

  async changeEmail(request: ChangeEmailRequest): Promise<boolean> {
    this.pending.set(true);
    this.error.set(null);
    this.verificationSentTo.set(null);
    try {
      await firstValueFrom(this.api.changeEmail(request));
      this.verificationSentTo.set(request.newEmail);
      return true;
    } catch (error) {
      const e = AppError.from(error);
      this.error.set(
        e.code === 'invalid-credential' || e.code === 'wrong-password'
          ? 'La contraseña actual no es correcta.'
          : e.code === 'email-already-in-use' || e.code === 'conflict' || e.status === 409
            ? 'Ese correo ya está en uso por otra cuenta. Usa uno distinto.'
            : e.message
      );
      return false;
    } finally {
      this.pending.set(false);
    }
  }
}
