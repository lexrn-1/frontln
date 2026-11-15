import { Observable } from 'rxjs';

import { contractPending } from '../../../core/http/contract-pending';
import { Participant, StudySession } from '../models/study-room.models';

/**
 * Datos de la sala de estudio (sin estado): sesión/objetivo (REST) y participantes (realtime
 * `room:snapshot`). El chat NO está aquí: vive en `core/chat` (`ChatStore`), compartido con `/chats`.
 */
export abstract class StudyRoomService {
  abstract readonly isDemo: boolean;
  /** Objetivo actual, progreso e inicio de la sesión. */
  abstract getSession(roomId: string): Observable<StudySession>;
  /** Participantes presentes (en producción: snapshot de realtime al entrar). */
  abstract getParticipants(roomId: string): Observable<Participant[]>;
}

/**
 * Adaptador real, todavía sin contrato: no hay conexión Socket.IO (la ruta pública responde 404,
 * ver EVIDENCE-public-api.md) ni DTO de historial/sesión. Cada operación devuelve `contract-pending`.
 */
export class PendingStudyRoomService extends StudyRoomService {
  readonly isDemo = false;

  getSession(roomId: string): Observable<StudySession> {
    return contractPending(`Sesión de estudio de ${roomId} (objetivo y progreso: sin endpoint en el plan)`);
  }
  getParticipants(roomId: string): Observable<Participant[]> {
    return contractPending(`Realtime room:snapshot de ${roomId}`);
  }
}
