/**
 * Configuración pública por entorno (sin credenciales administrativas).
 *
 * Identidad y backend se conmutan por separado, para poder usar Firebase Auth real
 * mientras backend-api (Quarkus) aún no existe:
 * - `useFirebaseAuth`: `true` usa Firebase Auth; `false` simula la identidad.
 * - `useMocks`: `true` simula backend-api (`/api/v1/...`); `false` llama a `apiUrl`.
 * Componentes y stores no cambian en ninguna combinación.
 */
export const runtimeConfig = {
  /** URL base de backend-api (REST). */
  apiUrl: 'http://localhost:8080/api',
  /** URL de backend-realtime (Socket.IO por WSS). Se usa desde el Sprint 2. */
  realtimeUrl: 'http://localhost:8081',
  /** Usa adaptadores simulados de backend-api en lugar de HTTP. */
  useMocks: true,
  /** Usa Firebase Auth real en lugar de la identidad simulada. */
  useFirebaseAuth: true,
  /** Latencia simulada de los mocks, para ver estados de carga. */
  mockLatencyMs: 650,
  /**
   * Dominios de correo institucional aceptados. Pendiente de confirmar con el equipo
   * (plan de trabajo, "Riesgos y decisiones de arranque"). Vacío = cualquier dominio
   * que contenga `.edu`.
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
