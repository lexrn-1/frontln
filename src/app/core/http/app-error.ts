import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorPayload, ApiFieldError } from './api-response.model';

/** Error normalizado que consumen stores y componentes, venga de HTTP o de Firebase. */
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 0,
    readonly fieldErrors: ApiFieldError[] = [],
    readonly traceId?: string
  ) {
    super(message);
    this.name = 'AppError';
  }

  static from(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as Partial<ApiErrorPayload> | null;
      return new AppError(
        payload?.code ?? defaultCode(error.status),
        payload?.message ?? defaultMessage(error.status),
        error.status,
        payload?.fieldErrors ?? [],
        payload?.traceId
      );
    }
    return new AppError('unknown', 'Ocurrió un error inesperado. Inténtalo de nuevo.');
  }
}

function defaultCode(status: number): string {
  switch (status) {
    case 0:
      return 'network';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not-found';
    case 409:
      return 'conflict';
    default:
      return 'server';
  }
}

function defaultMessage(status: number): string {
  switch (status) {
    case 0:
      return 'No pudimos conectar con el servidor. Revisa tu conexión.';
    case 401:
      return 'Tu sesión expiró. Vuelve a iniciar sesión.';
    case 403:
      return 'No tienes permiso para realizar esta acción.';
    case 409:
      return 'El recurso ya existe o está en conflicto.';
    default:
      return 'El servidor no respondió como se esperaba. Inténtalo más tarde.';
  }
}
