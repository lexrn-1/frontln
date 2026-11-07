/**
 * Configuración pública por entorno (sin credenciales administrativas).
 *
 * Mientras el backend Quarkus y Firebase no estén conectados, `useMocks` mantiene
 * la aplicación funcionando con adaptadores simulados que respetan los mismos
 * contratos (`/api/v1/...`). Para conectar el backend real basta con poner
 * `useMocks: false` y ajustar las URLs: componentes y stores no cambian.
 */
export const runtimeConfig = {
  /** URL base de backend-api (REST). */
  apiUrl: 'http://localhost:8080/api',
  /** URL de backend-realtime (Socket.IO por WSS). Se usa desde el Sprint 2. */
  realtimeUrl: 'http://localhost:8081',
  /** Usa adaptadores simulados en lugar de HTTP/Firebase reales. */
  useMocks: true,
  /** Latencia simulada de los mocks, para ver estados de carga. */
  mockLatencyMs: 650,
  /**
   * Dominios de correo institucional aceptados. Pendiente de confirmar con el equipo
   * (plan de trabajo, "Riesgos y decisiones de arranque"). Vacío = cualquier dominio
   * que contenga `.edu`.
   */
  institutionalDomains: [] as string[],
  /** Configuración web de Firebase (pública). Rellenar al integrar Firebase Auth. */
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    appId: ''
  }
};
