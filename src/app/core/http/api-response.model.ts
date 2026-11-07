export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

/**
 * Formato de error acordado con backend (plan de trabajo, "Contratos"):
 * `code`, `message`, `fieldErrors` y `traceId`.
 */
export interface ApiErrorPayload {
  success: false;
  code: string;
  message: string;
  fieldErrors?: ApiFieldError[];
  traceId?: string;
  timestamp: string;
}
