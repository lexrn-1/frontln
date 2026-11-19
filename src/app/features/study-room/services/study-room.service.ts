import { Injectable, inject } from '@angular/core';
import { of, from, map } from 'rxjs';
import { RealtimeService, LiveParticipant } from '../../../core/realtime/realtime.service';
import { Observable } from 'rxjs';

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

@Injectable()
export class RealtimeStudyRoomService extends StudyRoomService {
  readonly isDemo = false;
  private readonly realtime = inject(RealtimeService);

  getSession(roomId: string): Observable<StudySession> {
    return of({ roomId, goal: null, startedAt: null });
  }
  getParticipants(roomId: string): Observable<Participant[]> {
    return from(this.realtime.enter(roomId)).pipe(
      map((snapshot) => snapshot.participants.map((p) => participantView(p, snapshot.connectionId)))
    );
  }
}

export function participantView(p: LiveParticipant, self: string): Participant {
  return {
    id: p.connectionId,
    uid: p.uid,
    label: p.connectionId === self ? 'Tú' : p.displayName,
    fullName: p.displayName,
    initials: p.displayName
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0] ?? '')
      .join('')
      .toUpperCase(),
    tone: 'lavender',
    isSelf: p.connectionId === self,
    micOn: p.micOn,
    camOn: p.camOn,
    screenSharing: p.screenSharing,
  };
}
