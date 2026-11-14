import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { runtimeConfig } from '../../config/runtime-config';
import { CreateProfileRequest, SessionResponse, UserProfile, ProfileResponse } from '../models/auth.models';
import { SKIP_AUTH_RECOVERY } from '../interceptors/auth-context';
import { fromProfileResponse, toProfileRequest } from './profile.mapper';

export abstract class AuthService {
  abstract getSession(): Observable<SessionResponse>;
  abstract getMe(): Observable<UserProfile>;
  abstract createProfile(body: CreateProfileRequest): Observable<UserProfile>;
  abstract logout(): Observable<void>;
}
@Injectable()
export class HttpAuthService extends AuthService {
  private readonly http = inject(HttpClient);
  private readonly base = runtimeConfig.apiUrl;
  getSession(): Observable<SessionResponse> {
    return this.http.get<SessionResponse>(`${this.base}/session`).pipe(timeout(15000));
  }
  getMe(): Observable<UserProfile> {
    return this.http.get<ProfileResponse>(`${this.base}/me`).pipe(timeout(15000), map(fromProfileResponse));
  }
  createProfile(body: CreateProfileRequest): Observable<UserProfile> {
    return this.http.post<ProfileResponse>(`${this.base}/me/complete`, toProfileRequest(body)).pipe(timeout(15000), map(fromProfileResponse));
  }
  logout(): Observable<void> {
    return this.http.post<void>(`${this.base}/session/logout`, null, {
      context: new HttpContext().set(SKIP_AUTH_RECOVERY, true)
    }).pipe(timeout(15000));
  }
}
