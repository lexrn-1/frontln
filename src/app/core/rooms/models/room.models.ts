/** Modelo de presentación compartido por tarjetas y stores.
 * El contrato REST mínimo está en room.dto.ts; minimal oculta metadatos exclusivos de muestras.
 */
export const ROOM_CATEGORIES = [
  'programacion',
  'matematicas',
  'ciencias',
  'literatura',
  'derecho',
  'idiomas',
  'otras',
] as const;
export type RoomCategory = (typeof ROOM_CATEGORIES)[number];

export const ROOM_CATEGORY_LABELS: Record<RoomCategory, string> = {
  programacion: 'Programación',
  matematicas: 'Matemáticas',
  ciencias: 'Ciencias',
  literatura: 'Literatura',
  derecho: 'Derecho',
  idiomas: 'Idiomas',
  otras: 'Otras',
};

/** `live`: sesión en curso · `scheduled`: con horario futuro · `idle`: sin sesión programada. */
export type RoomStatus = 'live' | 'scheduled' | 'idle';

/**
 * Horario de estudio de una sala. `once` usa `date` (AAAA-MM-DD); `weekly` usa `weekdays`
 * (0 = lunes … 6 = domingo). `time` es HH:mm en la hora local del usuario (zona horaria por definir con backend).
 */
export interface RoomSchedule {
  frequency: 'once' | 'daily' | 'weekly';
  time: string;
  date?: string;
  weekdays?: number[];
}

export interface Room {
  /** Contrato mínimo: sin catálogo, horario ni recuento persistente. */
  minimal?: boolean;
  /** ID de la sala; funciona también como código de invitación (plan de trabajo). */
  id: string;
  name: string;
  /** Materia en texto libre ("Medicina"). */
  subject: string;
  /** Categoría usada por los filtros de "Explorar salas". */
  category: RoomCategory;
  participantCount: number;
  status: RoomStatus;
  /** Inicio de la sesión, ISO 8601 UTC; `null` si no hay horario. */
  startsAt: string | null;
  /** Horario configurado (puede repetirse); `startsAt` es su próxima ocurrencia. */
  schedule: RoomSchedule | null;
  /** El usuario actual es anfitrión (solo el anfitrión edita o elimina). */
  isHost: boolean;
  /** El usuario actual ya pertenece a la sala. */
  isMember: boolean;
}

export interface CreateRoomRequest {
  name: string;
  category: RoomCategory;
  schedule: RoomSchedule | null;
}

export interface UpdateRoomRequest {
  name: string;
}

export interface RoomQuery {
  text: string;
  category: RoomCategory | 'all';
}
