/** Actual Quarkus readiness plus the independently loaded Firestore demo message. */
export interface SystemStatus {
  api: 'UP' | 'DOWN';
  firestore: 'UP' | 'DOWN';
  sampleMessage: string | null;
  demoState: 'available' | 'missing' | 'unavailable';
  checkedAt: string;
}
export interface ReadinessResponse {
  status: 'UP' | 'DOWN';
  checks: Array<{ name: string; status: 'UP' | 'DOWN' }>;
}
