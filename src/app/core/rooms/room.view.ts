import { scheduleLabel } from '../utils/schedule-label';
import { recurringLabel } from './room-schedule';
import { ROOM_CATEGORY_LABELS, Room, RoomCategory } from './models/room.models';

/** Datos listos para pintar una tarjeta de sala (estructuralmente igual a `RoomCardView` de shared). */
export interface RoomView {
  id: string;
  name: string;
  subjectLabel: string;
  initial: string;
  tone: 'rose' | 'mint' | 'lavender' | 'sky' | 'peach';
  participantsLabel: string;
  scheduleLabel: string;
  live: boolean;
  isHost: boolean;
  isMember: boolean;
}

const TONES: Record<RoomCategory, RoomView['tone']> = {
  programacion: 'peach',
  literatura: 'rose',
  matematicas: 'rose',
  ciencias: 'mint',
  derecho: 'lavender',
  idiomas: 'sky',
  otras: 'peach'
};

export function toRoomView(room: Room, now: Date = new Date()): RoomView {
  return {
    id: room.id,
    name: room.name,
    subjectLabel: room.subject || ROOM_CATEGORY_LABELS[room.category],
    initial: room.category === 'matematicas' ? '∫' : room.category === 'programacion' ? '</>' : (room.subject || room.name).charAt(0).toUpperCase(),
    tone: TONES[room.category],
    participantsLabel: room.participantCount === 1 ? '1 persona' : `${room.participantCount} personas`,
    scheduleLabel:
      room.status === 'live'
        ? 'En curso'
        : ((room.schedule && recurringLabel(room.schedule)) ?? (room.startsAt ? scheduleLabel(room.startsAt, now) : 'Sin horario')),
    live: room.status === 'live',
    isHost: room.isHost,
    isMember: room.isMember
  };
}
