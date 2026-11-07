import { Observable } from 'rxjs';

import { IdentityUser } from '../models/auth.models';

/**
 * Puerto de identidad. La implementación real envolverá el SDK web de Firebase Auth
 * (correo/contraseña y Google); hoy se usa `MockIdentityProvider`.
 *
 * Errores: se lanzan como `AppError` con los códigos
 * `email-already-in-use`, `invalid-credential`, `popup-closed`, `google-failed`, `network`.
 */
export abstract class IdentityProvider {
  /** Emite el usuario actual; la primera emisión marca la resolución inicial de la sesión. */
  abstract readonly user$: Observable<IdentityUser | null>;

  abstract signUpWithEmail(email: string, password: string, displayName: string): Observable<IdentityUser>;
  abstract signInWithEmail(email: string, password: string): Observable<IdentityUser>;
  abstract signInWithGoogle(): Observable<IdentityUser>;
  abstract signOut(): Observable<void>;

  /** ID token de Firebase para el header `Authorization: Bearer`. */
  abstract getIdToken(forceRefresh?: boolean): Observable<string | null>;
}
