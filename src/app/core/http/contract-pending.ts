import { Observable, throwError } from 'rxjs';

import { AppError } from './app-error';

/**
 * Operación cuyo contrato HTTP aún no publica backend. Los servicios HTTP la usan en lugar de
 * inventar método, cuerpo o respuesta: los stores muestran el error normal de la pantalla.
 * Se sustituye por la llamada real cuando exista el contrato (ver docs/BACKEND-PENDING.md).
 */
export function contractPending<T>(operation: string): Observable<T> {
  return throwError(
    () =>
      new AppError(
        'contract-pending',
        'Esta función se conectará cuando el backend publique su contrato.',
        501,
        [],
        operation
      )
  );
}
