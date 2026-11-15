import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { isPrivateApi } from '../auth/interceptors/auth-token.interceptor';
import { AppError } from '../http/app-error';
import { Announcer } from '../layout/announcer.service';

/** Una petición con este token gestiona sus errores por su cuenta (sin aviso global). */
export const SILENT_ERRORS = new HttpContextToken<boolean>(() => false);

let lastNotice = { text: '', at: 0 };

/**
 * Interceptor global de errores. Convierte `HttpErrorResponse` en `AppError` (código kebab-case,
 * mensaje comprensible y `fieldErrors` para 400/422) y avisa UNA sola vez de los fallos que ningún
 * formulario sabe mostrar: 403 (sin permiso), 5xx y falta de conexión. 400, 404, 409 y 422 los
 * resuelve quien llama (mensaje junto al campo o estado de error).
 *
 * Va primero en la cadena: el 401 lo trata antes `authTokenInterceptor` (renueva token y, si
 * persiste, cierra sesión con `?motivo=expired`), por lo que aquí solo llega ya resuelto.
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo la API propia: health, demo y terceros conservan su error original.
  if (!isPrivateApi(req.url)) return next(req);
  const announcer = inject(Announcer);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
      const appError = AppError.from(error);
      const notify = appError.status === 0 || appError.status === 403 || appError.status >= 500;
      if (notify && !req.context.get(SILENT_ERRORS)) {
        const now = Date.now();
        if (lastNotice.text !== appError.message || now - lastNotice.at > 4000) {
          lastNotice = { text: appError.message, at: now };
          announcer.announce(appError.message, 'error');
        }
      }
      return throwError(() => appError);
    })
  );
};
