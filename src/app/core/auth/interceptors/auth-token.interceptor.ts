import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { runtimeConfig } from '../../config/runtime-config';
import { AuthStore } from '../store/auth.store';
import { IdentityProvider } from '../services/identity-provider';
import { SKIP_AUTH_RECOVERY } from './auth-context';

/** Exact origin and REST path boundary; health, demo and third parties never receive tokens. */
export function isPrivateApi(url: string): boolean {
  try {
    const target = new URL(url, window.location.origin);
    const base = new URL(runtimeConfig.apiUrl);
    return target.origin === base.origin && target.pathname.startsWith(`${base.pathname}/`)
      && target.pathname !== `${base.pathname}/demo`;
  } catch { return false; }
}
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isPrivateApi(req.url)) return next(req);
  const identity = inject(IdentityProvider);
  const store = inject(AuthStore);
  const router = inject(Router);
  const send = (token: string | null) => next(token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
  return identity.getIdToken().pipe(
    switchMap(send),
    catchError((error: unknown) => {
      if (req.context.get(SKIP_AUTH_RECOVERY) || !(error instanceof HttpErrorResponse) || error.status !== 401)
        return throwError(() => error);
      return identity.getIdToken(true).pipe(
        switchMap(send),
        catchError((retryError: unknown) => {
          if (retryError instanceof HttpErrorResponse && retryError.status === 401)
            void store.logout({ reason: 'expired', returnUrl: router.url, revokeRemote: false });
          return throwError(() => retryError);
        })
      );
    })
  );
};
