import { Observable } from 'rxjs';

import { contractPending } from '../../../core/http/contract-pending';

/** Cambio de correo (US-04): exige la contraseña actual para reautenticar. */
export interface ChangeEmailRequest {
  newEmail: string;
  currentPassword: string;
}

/** Operaciones de Configuración (sin estado). Ver `SettingsStore`. */
export abstract class SettingsService {
  abstract readonly isDemo: boolean;
  /** Inicia el cambio de correo; el nuevo correo queda pendiente hasta verificarlo. */
  abstract changeEmail(request: ChangeEmailRequest): Observable<void>;
}

/**
 * Adaptador real pendiente. El plan (US-04) pide reautenticación y verificación de Firebase "cuando
 * corresponda" y coherencia entre Auth y perfil, pero no define el flujo: falta decidir si el
 * cliente usa `verifyBeforeUpdateEmail` de Firebase y qué endpoint sincroniza el perfil.
 */
export class HttpSettingsService extends SettingsService {
  readonly isDemo = false;
  changeEmail(_request: ChangeEmailRequest): Observable<void> {
    return contractPending('Cambio de correo con reautenticación (US-04, flujo Firebase + API no definido)');
  }
}
