import { Injectable } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth';
import { Observable, defer, from, map } from 'rxjs';

import { firebaseApp } from '../../firebase/firebase-app';
import { AppError } from '../../http/app-error';
import { IdentityUser } from '../models/auth.models';
import { IdentityProvider } from './identity-provider';

/** Adaptador de Firebase Auth (SDK web): correo/contraseña y Google. */
@Injectable()
export class FirebaseIdentityProvider extends IdentityProvider {
  private readonly auth: Auth = getAuth(firebaseApp());

  readonly user$: Observable<IdentityUser | null> = new Observable((subscriber) =>
    onAuthStateChanged(
      this.auth,
      (user) => subscriber.next(user ? toUser(user) : null),
      (error) => subscriber.error(toAppError(error))
    )
  );

  signUpWithEmail(email: string, password: string, displayName: string): Observable<IdentityUser> {
    return run(async () => {
      const { user } = await createUserWithEmailAndPassword(this.auth, email.trim(), password);
      await updateProfile(user, { displayName });
      return toUser(user);
    });
  }

  signInWithEmail(email: string, password: string): Observable<IdentityUser> {
    return run(async () => {
      const { user } = await signInWithEmailAndPassword(this.auth, email.trim(), password);
      return toUser(user);
    });
  }

  signInWithGoogle(): Observable<IdentityUser> {
    return run(async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const { user } = await signInWithPopup(this.auth, provider);
      return toUser(user);
    }, 'google-failed');
  }

  signOut(): Observable<void> {
    return run(() => signOut(this.auth));
  }

  getIdToken(forceRefresh = false): Observable<string | null> {
    return defer(() => {
      const user = this.auth.currentUser;
      return user ? from(user.getIdToken(forceRefresh)) : from([null]);
    }).pipe(map((token) => token ?? null));
  }
}

function run<T>(fn: () => Promise<T>, fallback = 'unknown'): Observable<T> {
  return defer(async () => {
    try {
      return await fn();
    } catch (error) {
      throw toAppError(error, fallback);
    }
  });
}

function toUser(user: User): IdentityUser {
  const google = user.providerData.some((p) => p.providerId === GoogleAuthProvider.PROVIDER_ID);
  return {
    uid: user.uid,
    email: (user.email ?? '').toLowerCase(),
    displayName: user.displayName,
    photoUrl: user.photoURL,
    provider: google ? 'google' : 'password'
  };
}

/** Traduce los códigos de Firebase a los `AppError` que entienden store y componentes. */
function toAppError(error: unknown, fallback = 'unknown'): AppError {
  if (!(error instanceof FirebaseError)) {
    return AppError.from(error);
  }
  switch (error.code) {
    case 'auth/email-already-in-use':
      return new AppError('email-already-in-use', 'Ya existe una cuenta con este correo.');
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return new AppError('invalid-credential', 'Correo o contraseña incorrectos.');
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return new AppError('popup-closed', 'Cerraste la ventana de Google antes de terminar.');
    case 'auth/network-request-failed':
      return new AppError('network', 'No pudimos conectar con el servidor. Revisa tu conexión.');
    case 'auth/too-many-requests':
      return new AppError('too-many-requests', 'Demasiados intentos. Espera un momento e inténtalo de nuevo.');
    case 'auth/weak-password':
      return new AppError('weak-password', 'La contraseña es demasiado débil.');
    default:
      return fallback === 'google-failed'
        ? new AppError('google-failed', 'No pudimos iniciar sesión con Google. Inténtalo de nuevo.')
        : new AppError(error.code, 'Ocurrió un error inesperado. Inténtalo de nuevo.');
  }
}
