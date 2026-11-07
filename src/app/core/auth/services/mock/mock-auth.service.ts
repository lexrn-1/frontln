import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AppError } from '../../../http/app-error';
import { mockFail, mockOk } from '../../../http/mock-latency';
import { CreateProfileRequest, UserProfile, UsernameAvailability } from '../../models/auth.models';
import { AuthService } from '../auth.service';
import { mockDb } from './mock-db';

/** Simula backend-api: el "servidor" decide el uid a partir de la sesión y la unicidad del username. */
@Injectable()
export class MockAuthService extends AuthService {
  getMe(): Observable<UserProfile> {
    const { sessionUid, profiles } = mockDb.read();
    if (!sessionUid) {
      return mockFail(new AppError('unauthorized', 'Sesión no válida.', 401));
    }
    const profile = profiles.find((p) => p.uid === sessionUid);
    return profile
      ? mockOk(profile)
      : mockFail(new AppError('profile-not-found', 'El perfil aún no existe.', 404));
  }

  createProfile(body: CreateProfileRequest): Observable<UserProfile> {
    const state = mockDb.read();
    const account = state.accounts.find((a) => a.uid === state.sessionUid);
    if (!account) {
      return mockFail(new AppError('unauthorized', 'Sesión no válida.', 401));
    }
    const username = body.username.trim().toLowerCase();
    if (state.profiles.some((p) => p.username === username && p.uid !== account.uid)) {
      return mockFail(
        new AppError('username-taken', 'Este nombre de usuario ya está en uso.', 409, [
          { field: 'username', message: 'Este nombre de usuario ya está en uso.' }
        ])
      );
    }
    const profile: UserProfile = {
      uid: account.uid,
      email: account.email,
      nombres: body.nombres.trim(),
      apellidos: body.apellidos.trim(),
      username,
      avatar: body.avatar,
      createdAt: new Date().toISOString()
    };
    mockDb.update((s) => {
      s.profiles = s.profiles.filter((p) => p.uid !== account.uid);
      s.profiles.push(profile);
    });
    return mockOk(profile);
  }

  checkUsername(username: string): Observable<UsernameAvailability> {
    const normalized = username.trim().toLowerCase();
    const { profiles, sessionUid } = mockDb.read();
    const taken = profiles.some((p) => p.username === normalized && p.uid !== sessionUid);
    return mockOk({ username: normalized, available: !taken });
  }
}
