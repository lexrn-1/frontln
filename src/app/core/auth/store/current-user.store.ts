import { Injectable, computed, inject } from '@angular/core';

import { DevAccess } from '../../dev/dev-access';
import { UserProfile } from '../models/auth.models';
import { AuthStore } from './auth.store';

/**
 * Usuario visible para las pantallas privadas (shell, panel, perfil). Presenta un único origen
 * de perfil: el de `AuthStore` o, solo con el acceso de desarrollo activo, el de demostración.
 * Las pantallas no consultan `AuthStore` ni `DevAccess` directamente.
 */
@Injectable({ providedIn: 'root' })
export class CurrentUser {
  private readonly auth = inject(AuthStore);
  private readonly dev = inject(DevAccess);

  readonly isDemo = computed(() => this.dev.active());
  readonly profile = computed<UserProfile | null>(() => (this.dev.active() ? this.dev.profile() : this.auth.profile()));
  readonly fullName = computed(() => {
    const p = this.profile();
    return p ? `${p.nombres} ${p.apellidos}`.trim() : this.auth.displayName();
  });
  readonly firstName = computed(() => this.profile()?.nombres ?? '');
  /** Proveedor de identidad (determina si el correo se cambia aquí o en Google). */
  readonly provider = computed(() => this.auth.user()?.provider ?? 'password');

  /** Aplica un perfil ya confirmado por la capa de datos. */
  applyProfile(profile: UserProfile): void {
    if (this.dev.active()) this.dev.profile.set(profile);
    else this.auth.applyProfile(profile);
  }

  async logout(): Promise<void> {
    if (this.dev.active()) {
      this.dev.exit();
      return;
    }
    await this.auth.logout();
  }
}
