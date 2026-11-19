import {Room} from './room.models';
import {RoomWire} from './room.dto';
export function toRoom(dto: RoomWire): Room {
  return {
    id: dto.id,
    name: dto.name,
    subject: '',
    category: 'otras',
    participantCount: 0,
    status: 'idle',
    startsAt: null,
    schedule: null,
    isHost: dto.role === 'OWNER',
    isMember: true,
    minimal: true,
  };
}
