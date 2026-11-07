import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { AppError } from '../../http/app-error';
import { IdentityUser } from '../models/auth.models';
import { IdentityProvider } from './identity-provider';

/**
 * Punto de integración con Firebase Auth (SDK web). Pendiente: instalar `firebase`,
 * inicializar con `runtimeConfig.firebase` y mapear:
 *
 * - `user$`               → `onAuthStateChanged(auth, ...)`
 * - `signUpWithEmail`     → `createUserWithEmailAndPassword` + `updateProfile`
 * - `signInWithEmail`     → `signInWithEmailAndPassword`
 * - `signInWithGoogle`    → `signInWithPopup(auth, new GoogleAuthProvider())`
 * - `signOut`             → `signOut(auth)`
 * - `getIdToken(force)`   → `auth.currentUser?.getIdToken(force)`
 *
 * Códigos Firebase → `AppError`: `auth/email-already-in-use` → `email-already-in-use`;
 * `auth/invalid-credential`, `auth/wrong-password`, `auth/user-not-found` → `invalid-credential`;
 * `auth/popup-closed-by-user`, `auth/cancelled-popup-request` → `popup-closed`;
 * `auth/network-request-failed` → `network`; resto en Google → `google-failed`.
 */
@Injectable()
export class FirebaseIdentityProvider extends IdentityProvider {
  readonly user$: Observable<IdentityUser | null> = of(null);

  signUpWithEmail(): Observable<IdentityUser> {
    return notConfigured();
  }

  signInWithEmail(): Observable<IdentityUser> {
    return notConfigured();
  }

  signInWithGoogle(): Observable<IdentityUser> {
    return notConfigured();
  }

  signOut(): Observable<void> {
    return of(undefined);
  }

  getIdToken(): Observable<string | null> {
    return of(null);
  }
}

function notConfigured<T>(): Observable<T> {
  return throwError(
    () => new AppError('not-configured', 'Firebase Auth aún no está configurado en este entorno.')
  );
}
