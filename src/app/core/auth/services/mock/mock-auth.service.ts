import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, take } from 'rxjs';

import { AppError } from '../../../http/app-error';
import { mockFail, mockOk } from '../../../http/mock-latency';
import {
  CreateProfileRequest,
  IdentityUser,
  UserProfile,
  UsernameAvailability
} from '../../models/auth.models';
import { AuthService } from '../auth.service';
import { IdentityProvider } from '../identity-provider';
import { mockDb } from './mock-db';

/**
 * Simula backend-api: el "servidor" decide el uid a partir de la sesión y la unicidad del username.
 * La sesión sale del `IdentityProvider` activo, así funciona tanto con la identidad simulada
 * como con Firebase Auth real (como haría el backend al verificar el ID token).
 */
@Injectable()
export class MockAuthService extends AuthService {
  private readonly identity = inject(IdentityProvider);

  getMe(): Observable<UserProfile> {
    return this.withSession((user) => {
      const profile = mockDb.read().profiles.find((p) => p.uid === user.uid);
      return profile
        ? mockOk(profile)
        : mockFail(new AppError('profile-not-found', 'El perfil aún no existe.', 404));
    });
  }

  createProfile(body: CreateProfileRequest): Observable<UserProfile> {
    return this.withSession((user) => {
      const username = body.username.trim().toLowerCase();
      if (mockDb.read().profiles.some((p) => p.username === username && p.uid !== user.uid)) {
        return mockFail(
          new AppError('username-taken', 'Este nombre de usuario ya está en uso.', 409, [
            { field: 'username', message: 'Este nombre de usuario ya está en uso.' }
          ])
        );
      }
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email,
        nombres: body.nombres.trim(),
        apellidos: body.apellidos.trim(),
        username,
        avatar: body.avatar,
        createdAt: new Date().toISOString()
      };
      mockDb.update((s) => {
        s.profiles = s.profiles.filter((p) => p.uid !== user.uid);
        s.profiles.push(profile);
      });
      return mockOk(profile);
    });
  }

  checkUsername(username: string): Observable<UsernameAvailability> {
    return this.identity.user$.pipe(
      take(1),
      switchMap((user) => {
        const normalized = username.trim().toLowerCase();
        const taken = mockDb
          .read()
          .profiles.some((p) => p.username === normalized && p.uid !== user?.uid);
        return mockOk({ username: normalized, available: !taken });
      })
    );
  }

  private withSession<T>(fn: (user: IdentityUser) => Observable<T>): Observable<T> {
    return this.identity.user$.pipe(
      take(1),
      switchMap((user) =>
        user ? fn(user) : mockFail<T>(new AppError('unauthorized', 'Sesión no válida.', 401))
      )
    );
  }
}
