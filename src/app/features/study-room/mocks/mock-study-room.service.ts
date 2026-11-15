import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { mockOk } from '../../../core/http/mock-latency';
import { Participant, StudySession } from '../models/study-room.models';
import { StudyRoomService } from '../services/study-room.service';

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();

/**
 * DATOS DE DEMOSTRACIÓN de la sala: participantes y mensajes inventados, con envío solo local.
 * NO hay audio, vídeo ni sockets: sirve únicamente para ver la interfaz. Sin conexión real.
 */
@Injectable()
export class MockStudyRoomService extends StudyRoomService {
  readonly isDemo = true;

  getSession(roomId: string): Observable<StudySession> {
    return mockOk({
      roomId,
      // Solo la sala de demostración en curso (SR-3D9F) tiene sesión iniciada.
      startedAt: roomId === 'SR-3D9F' ? minutesAgo(48) : null,
      goal: { title: 'Objetivo actual', detail: 'Resolver ejercicios 5–10 antes de las 19:00', progressPercent: 54 }
    });
  }

  getParticipants(): Observable<Participant[]> {
    return mockOk([
      { id: 'p1', label: 'Lucía C.', fullName: 'Lucía Castro', initials: 'LC', tone: 'peach', isSelf: false, micOn: true, camOn: true },
      { id: 'p2', label: 'Mateo S.', fullName: 'Mateo Sánchez', initials: 'MS', tone: 'mint', isSelf: false, micOn: false, camOn: false },
      { id: 'p3', label: 'Ana V.', fullName: 'Ana Vidal', initials: 'AV', tone: 'sky', isSelf: false, micOn: true, camOn: true },
      { id: 'p4', label: 'Tú', fullName: 'Tú', initials: 'TÚ', tone: 'rose', isSelf: true, micOn: false, camOn: false }
    ]);
  }
}
