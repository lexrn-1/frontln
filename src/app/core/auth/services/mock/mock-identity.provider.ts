import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, defer, filter, of, tap } from 'rxjs';

import { AppError } from '../../../http/app-error';
import { mockFail, mockOk } from '../../../http/mock-latency';
import { IdentityUser } from '../../models/auth.models';
import { IdentityProvider } from '../identity-provider';
import { MockAccount, mockDb } from './mock-db';

/** Cuenta que devuelve el "popup" simulado de Google. */
const GOOGLE_ACCOUNT = {
  email: 'estudiante.google@universidad.edu',
  displayName: 'Estudiante Google'
};

/** Simula Firebase Auth: sesión persistente, errores con los códigos de Firebase. */
@Injectable()
export class MockIdentityProvider extends IdentityProvider {
  private readonly user = new BehaviorSubject<IdentityUser | null | undefined>(undefined);

  private resolving = false;

  readonly user$: Observable<IdentityUser | null> = defer(() => {
    if (this.user.value === undefined && !this.resolving) {
      this.resolving = true;
      // Resolución inicial asíncrona, como onAuthStateChanged.
      setTimeout(() => {
        const { accounts, sessionUid } = mockDb.read();
        const account = accounts.find((a) => a.uid === sessionUid);
        this.user.next(account ? toUser(account) : null);
      }, 300);
    }
    return this.user.asObservable();
  }).pipe(filter((u): u is IdentityUser | null => u !== undefined));

  signUpWithEmail(email: string, password: string, displayName: string): Observable<IdentityUser> {
    const normalized = email.trim().toLowerCase();
    const { accounts } = mockDb.read();
    if (accounts.some((a) => a.email === normalized)) {
      return mockFail(new AppError('email-already-in-use', 'Ya existe una cuenta con este correo.'));
    }
    const account: MockAccount = {
      uid: `u-${crypto.randomUUID().slice(0, 8)}`,
      email: normalized,
      password,
      displayName,
      provider: 'password'
    };
    mockDb.update((s) => {
      s.accounts.push(account);
      s.sessionUid = account.uid;
    });
    return mockOk(toUser(account)).pipe(tap((u) => this.user.next(u)));
  }

  signInWithEmail(email: string, password: string): Observable<IdentityUser> {
    const normalized = email.trim().toLowerCase();
    const account = mockDb.read().accounts.find((a) => a.email === normalized);
    if (!account || account.password !== password) {
      return mockFail(new AppError('invalid-credential', 'Correo o contraseña incorrectos.'));
    }
    mockDb.update((s) => (s.sessionUid = account.uid));
    return mockOk(toUser(account)).pipe(tap((u) => this.user.next(u)));
  }

  signInWithGoogle(): Observable<IdentityUser> {
    let account = mockDb.read().accounts.find((a) => a.email === GOOGLE_ACCOUNT.email);
    if (!account) {
      account = {
        uid: `g-${crypto.randomUUID().slice(0, 8)}`,
        email: GOOGLE_ACCOUNT.email,
        password: null,
        displayName: GOOGLE_ACCOUNT.displayName,
        provider: 'google'
      };
      const created = account;
      mockDb.update((s) => s.accounts.push(created));
    }
    const uid = account.uid;
    mockDb.update((s) => (s.sessionUid = uid));
    return mockOk(toUser(account)).pipe(tap((u) => this.user.next(u)));
  }

  signOut(): Observable<void> {
    mockDb.update((s) => (s.sessionUid = null));
    this.user.next(null);
    return of(undefined);
  }

  getIdToken(): Observable<string | null> {
    const current = this.user.value;
    return of(current ? `mock-id-token.${current.uid}` : null);
  }
}

function toUser(a: MockAccount): IdentityUser {
  return {
    uid: a.uid,
    email: a.email,
    displayName: a.displayName,
    photoUrl: null,
    provider: a.provider
  };
}

