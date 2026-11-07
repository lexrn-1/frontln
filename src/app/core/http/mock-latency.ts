import { Observable, delay, of, throwError, timer, switchMap } from 'rxjs';

import { runtimeConfig } from '../config/runtime-config';

/** Respuesta simulada con la latencia configurada. Solo la usan los adaptadores mock. */
export function mockOk<T>(value: T): Observable<T> {
  return of(value).pipe(delay(runtimeConfig.mockLatencyMs));
}

export function mockFail<T>(error: unknown): Observable<T> {
  return timer(runtimeConfig.mockLatencyMs).pipe(switchMap(() => throwError(() => error)));
}
