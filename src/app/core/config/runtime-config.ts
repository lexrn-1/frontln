/**
 * Configuración pública por entorno (sin credenciales administrativas).
 *
 * Identidad y API se configuran por separado. El valor publicado usa ambas reales:
 * - `useFirebaseAuth`: `true` usa Firebase Auth; `false` simula la identidad.
 * - `useMocks`: `true` simula backend-api (`/api/v1/...`); `false` llama a `apiUrl`.
 * Componentes y stores no cambian en ninguna combinación.
 */
export const runtimeConfig = {
  /** URL REST completa: los servicios añaden únicamente la ruta del recurso. */
  apiUrl: 'https://api.5-253-232-179.sslip.io/api/v1',
  /** Origen público compartido; el gateway dirige /socket.io/ a realtime. */
  realtimeUrl: 'https://api.5-253-232-179.sslip.io',
  healthUrl: 'https://api.5-253-232-179.sslip.io/q/health/ready',
  socketPath: '/socket.io/',
  /**
   * Funcionalidades cuyo contrato HTTP está PROPUESTO por el frontend pero aún no existe en backend
   * (docs/BACKEND-INTEGRATION.md). Con `false` el adaptador HTTP no hace peticiones y devuelve
   * `contract-pending`; ponerlo en `true` solo cuando backend publique la ruta.
   */
  features: {
    chatApi: false,
    filesApi: false,
    boardApi: false
  },
  /** Chat: tamaño de página del historial. */
  chat: { pageSize: 30 },
  /** Paginación por defecto de los listados. */
  pagination: { defaultPageSize: 20 },
  /** Archivos adjuntos (el backend debe validar también). */
  files: {
    maxSizeBytes: 10 * 1024 * 1024,
    maxFiles: 5,
    allowedExtensions: ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'txt']
  },
  /** Usa adaptadores simulados de backend-api en lugar de HTTP. */
  useMocks: false,
  /** Usa Firebase Auth real en lugar de la identidad simulada. */
  useFirebaseAuth: true,
  /**
   * TEMPORAL. Habilita el botón "Acceso de desarrollo" del login (ver `core/dev/`). Solo surte
   * efecto con `isDevMode()`: los builds de producción lo ignoran aunque esté en `true`.
   * Ponerlo en `false` (o borrar `core/dev/`) al terminar la integración con el backend.
   */
  devAccess: true,
  /** Latencia simulada de los mocks, para ver estados de carga. */
  mockLatencyMs: 650,
  /**
   * Dominios de correo institucional aceptados. Pendiente de confirmar con el equipo
   * (plan de trabajo, "Riesgos y decisiones de arranque"). Vacío = cualquier correo válido; coincide con la política del backend.
   */
  institutionalDomains: [] as string[],
  /**
   * Configuración web de Firebase (proyecto `appmeet-dev`). Es pública por diseño: el
   * acceso se protege con dominios autorizados en Firebase Auth y reglas de seguridad.
   */
  firebase: {
    apiKey: 'AIzaSyD_4EiqpXD1kZs9jYBWb7CfbA0MsxUkCXU',
    authDomain: 'appmeet-dev.firebaseapp.com',
    projectId: 'appmeet-dev',
    storageBucket: 'appmeet-dev.firebasestorage.app',
    messagingSenderId: '594558549571',
    appId: '1:594558549571:web:dbd6d821acb7ce5a435ef6',
    measurementId: 'G-YRBCV8EWY3'
  }
};
