/**
 * Modelos visuales de la sala de estudio. Backend aún no publica el contrato de sesión de estudio,
 * participantes ni mensajes (docs/BACKEND-PENDING.md); estos tipos son el modelo de la interfaz y
 * los DTO "wire" se añadirán con su mapper cuando existan.
 */
export type ParticipantTone = 'peach' | 'mint' | 'sky' | 'rose' | 'lavender';

export interface Participant {
  uid?: string;
  screenSharing?: boolean;
  id: string;
  /** Nombre corto para la etiqueta de la tarjeta ("Lucía C."). */
  label: string;
  fullName: string;
  initials: string;
  tone: ParticipantTone;
  isSelf: boolean;
  /** Estado de micrófono informado por el participante (sincronización pendiente de realtime). */
  micOn: boolean;
  /** Estado de cámara informado por el participante (sincronización pendiente de realtime). */
  camOn: boolean;
}

export interface StudyGoal {
  title: string;
  detail: string;
  /** Avance del objetivo, 0–100. */
  progressPercent: number;
}

/** Datos de la sesión de estudio en curso de una sala. */
export interface StudySession {
  roomId: string;
  goal: StudyGoal | null;
  /** Inicio de la sesión (ISO 8601 UTC); `null` si aún no empezó. */
  startedAt: string | null;
}

export type RoomLayout = 'grid' | 'spotlight';
