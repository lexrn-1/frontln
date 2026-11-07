import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { runtimeConfig } from '../../config/runtime-config';
import { ApiResponse } from '../../http/api-response.model';
import { CreateProfileRequest, UserProfile, UsernameAvailability } from '../models/auth.models';

/**
 * Peticiones a backend-api relacionadas con la cuenta. Sin estado: el estado vive en `AuthStore`.
 * El token Bearer lo añade `authTokenInterceptor`.
 */
export abstract class AuthService {
  /** `GET /api/v1/me` → perfil, o error 404 (`profile-not-found`) si aún no existe. */
  abstract getMe(): Observable<UserProfile>;
  /** `POST /api/v1/me` → crea el perfil. 409 `username-taken` si el username ya existe. */
  abstract createProfile(body: CreateProfileRequest): Observable<UserProfile>;
  /** `GET /api/v1/usernames/{username}/availability` (orientativo: el servidor decide al crear). */
  abstract checkUsername(username: string): Observable<UsernameAvailability>;
}

@Injectable()
export class HttpAuthService extends AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = `${runtimeConfig.apiUrl}/v1`;

  getMe(): Observable<UserProfile> {
    return this.http.get<ApiResponse<UserProfile>>(`${this.base}/me`).pipe(map((r) => r.data));
  }

  createProfile(body: CreateProfileRequest): Observable<UserProfile> {
    return this.http.post<ApiResponse<UserProfile>>(`${this.base}/me`, body).pipe(map((r) => r.data));
  }

  checkUsername(username: string): Observable<UsernameAvailability> {
    return this.http
      .get<ApiResponse<UsernameAvailability>>(
        `${this.base}/usernames/${encodeURIComponent(username)}/availability`
      )
      .pipe(map((r) => r.data));
  }
}
