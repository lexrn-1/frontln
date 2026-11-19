import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { AppError } from '../../http/app-error';
import { mockFail, mockOk } from '../../http/mock-latency';
import { DEMO_JOIN_CODE, seedRooms } from '../mocks/rooms.mock';
import { CreateRoomRequest, ROOM_CATEGORY_LABELS, Room, RoomQuery, UpdateRoomRequest } from '../models/room.models';

import { nextOccurrence } from '../room-schedule';
import { RoomsService } from './rooms.service';

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Simula backend-api con datos en memoria (se reinician al recargar). Datos de demostración. */
@Injectable()
export class MockRoomsService extends RoomsService {
  readonly isDemo = true;
  readonly joinHint = `Modo demostración: prueba con ${DEMO_JOIN_CODE}.`;
  private rooms: Room[] = seedRooms();

  listMine(): Observable<Room[]> {
    return mockOk(this.rooms.filter((r) => r.isMember).map((r) => ({ ...r })));
  }

  listAvailable(query: RoomQuery): Observable<Room[]> {
    const text = fold(query.text.trim());
    const found = this.rooms.filter(
      (r) =>
        (query.category === 'all' || r.category === query.category) &&
        (!text || fold(`${r.name} ${r.subject}`).includes(text))
    );
    return mockOk(found.map((r) => ({ ...r })));
  }

  create(request: CreateRoomRequest): Observable<Room> {
    const name = request.name.trim();
    if (this.rooms.some((r) => r.isMember && r.name.toLowerCase() === name.toLowerCase())) {
      return mockFail(
        new AppError('room-name-taken', 'Ya tienes una sala con ese nombre.', 409, [
          { field: 'name', message: 'Ya tienes una sala con ese nombre.' },
        ])
      );
    }
    const startsAt = request.schedule ? nextOccurrence(request.schedule) : null;
    const room: Room = {
      id: `SR-${crypto
        .randomUUID()
        .replace(/[^A-Z0-9]/gi, '')
        .slice(0, 4)
        .toUpperCase()}`,
      name,
      subject: ROOM_CATEGORY_LABELS[request.category],
      category: request.category,
      participantCount: 1,
      status: startsAt ? 'scheduled' : 'idle',
      startsAt,
      schedule: request.schedule,
      isHost: true,
      isMember: true,
    };
    this.rooms = [room, ...this.rooms];
    return mockOk({ ...room });
  }

  join(code: string): Observable<Room> {
    const id = code
      .trim()
      .replace(/\s+/g, '')
      .toUpperCase()
      .replace(/^SR([A-Z0-9]{4})$/, 'SR-$1');
    const room = this.rooms.find((r) => r.id === id);
    if (!room) {
      return mockFail(new AppError('room-not-found', 'No encontramos ninguna sala con ese código.', 404));
    }
    if (!room.isMember) {
      this.rooms = this.rooms.map((r) =>
        r.id === id ? { ...r, isMember: true, participantCount: r.participantCount + 1 } : r
      );
    }
    return mockOk({ ...this.rooms.find((r) => r.id === id)! });
  }

  getById(id: string): Observable<Room> {
    const room = this.rooms.find((r) => r.id === normalizeRoomCode(id));
    return room
      ? mockOk({ ...room })
      : mockFail(new AppError('room-not-found', 'La sala no existe o ya no está disponible.', 404));
  }

  update(id: string, request: UpdateRoomRequest): Observable<Room> {
    const room = this.rooms.find((r) => r.id === id);
    if (!room) return mockFail(new AppError('room-not-found', 'La sala no existe.', 404));
    if (!room.isHost) return mockFail(new AppError('forbidden', 'Solo el anfitrión puede editar la sala.', 403));
    const name = request.name.trim();
    if (this.rooms.some((r) => r.id !== id && r.isMember && r.name.toLowerCase() === name.toLowerCase())) {
      return mockFail(new AppError('room-name-taken', 'Ya tienes una sala con ese nombre.', 409));
    }
    this.rooms = this.rooms.map((r) => (r.id === id ? { ...r, name } : r));
    return mockOk({ ...this.rooms.find((r) => r.id === id)! });
  }

  leave(id: string): Observable<void> {
    const room = this.rooms.find((r) => r.id === id);
    if (!room) return mockFail(new AppError('room-not-found', 'La sala no existe.', 404));
    if (room.isHost)
      return mockFail(new AppError('forbidden', 'El anfitrión no puede abandonar su sala; elimínala.', 403));
    this.rooms = this.rooms.map((r) =>
      r.id === id
        ? {
            ...r,
            isMember: false,
            participantCount: Math.max(0, r.participantCount - 1),
          }
        : r
    );
    return mockOk(undefined);
  }

  remove(id: string): Observable<void> {
    const room = this.rooms.find((r) => r.id === id);
    if (!room) return mockFail(new AppError('room-not-found', 'La sala no existe.', 404));
    if (!room.isHost) {
      return mockFail(new AppError('forbidden', 'Solo el anfitrión puede eliminar la sala.', 403));
    }
    this.rooms = this.rooms.filter((r) => r.id !== id);
    return mockOk(undefined);
  }
}

/** Formato exclusivo de las muestras visuales, no del contrato REST. */
function normalizeRoomCode(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/^SR([A-Z0-9]{4})$/, 'SR-$1');
}
