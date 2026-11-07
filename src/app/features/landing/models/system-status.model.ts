/**
 * Respuesta de `GET /api/v1/health` (Sprint 0): Quarkus lee un dato real de Firestore
 * para demostrar la cadena Vercel → API → Firestore.
 */
export interface SystemStatus {
  api: 'UP' | 'DOWN';
  firestore: 'UP' | 'DOWN';
  /** Dato de ejemplo leído de Firestore (p. ej. número de salas activas). */
  sample: { label: string; value: number };
  version: string;
  checkedAt: string;
}
