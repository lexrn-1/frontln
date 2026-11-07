import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { runtimeConfig } from '../../config/runtime-config';
import { AuthStore } from '../store/auth.store';

/** Solo se envía el token a dominios propios (backend-api y backend-realtime). */
const OWN_ORIGINS = [runtimeConfig.apiUrl, runtimeConfig.realtimeUrl].map((url) => new URL(url).origin);

function isOwnApi(req: HttpRequest<unknown>): boolean {
  try {
    return OWN_ORIGINS.includes(new URL(req.url, window.location.origin).origin);
  } catch {
    return false;
  }
}

function withToken(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  return token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
}

/**
 * Añade `Authorization: Bearer <ID token>`. Ante 401 renueva el token una vez y reintenta;
 * si vuelve a fallar, cierra la sesión conservando la URL actual. 403 y 409 se propagan
 * para que la pantalla los muestre (`AppError.from`). El token nunca va en URL ni en logs.
 */
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isOwnApi(req)) {
    return next(req);
  }
  const store = inject(AuthStore);
  const router = inject(Router);

  return store.getIdToken().pipe(
    switchMap((token) => next(withToken(req, token))),
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
        return throwError(() => error);
      }
      return store.getIdToken(true).pipe(
        switchMap((fresh) => next(withToken(req, fresh))),
        catchError((retryError: unknown) => {
          if (retryError instanceof HttpErrorResponse && retryError.status === 401) {
            void store.logout({ reason: 'expired', returnUrl: router.url });
          }
          return throwError(() => retryError);
        })
      );
    })
  );
};
