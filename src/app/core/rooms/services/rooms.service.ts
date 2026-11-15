import { Observable } from 'rxjs';

import { apiRoutes } from '../../config/api-routes';
import { contractPending } from '../../http/contract-pending';
import { CreateRoomRequest, Room, RoomQuery, UpdateRoomRequest } from '../models/room.models';

/**
 * Acceso a datos de salas (sin estado). Los componentes no lo usan directo: pasan por `RoomsStore`
 * o por el store de su feature. `provideRooms()` elige el adaptador.
 */
export abstract class RoomsService {
  /** `true` si los datos son de demostración (se rotulan así en la interfaz). */
  abstract readonly isDemo: boolean;
  /** Ayuda opcional para el modal "Unirse" (solo en demostración: un código que sí existe). */
  abstract readonly joinHint: string | null;
  /** Salas del usuario. */
  abstract listMine(): Observable<Room[]>;
  /** Salas descubribles ("Explorar salas"). */
  abstract listAvailable(query: RoomQuery): Observable<Room[]>;
  abstract create(request: CreateRoomRequest): Observable<Room>;
  /** Ingreso con ID/código de invitación (ya recortado y normalizado). */
  abstract join(code: string): Observable<Room>;
  abstract getById(id: string): Observable<Room>;
  /** Cambia el nombre; solo el anfitrión (403 en otro caso). Contrato PROPUESTO: `PATCH /rooms/{id}`. */
  abstract update(id: string, request: UpdateRoomRequest): Observable<Room>;
  /** Abandonar la sala (participantes no anfitriones). Contrato PROPUESTO: `POST /rooms/{id}/leave`. */
  abstract leave(id: string): Observable<void>;
  /** Eliminar solo está permitido al anfitrión (el servidor responde 403 en otro caso). */
  abstract remove(id: string): Observable<void>;
}

/**
 * Adaptador HTTP. Las rutas vienen del plan de trabajo, pero backend aún no publica método, cuerpo
 * ni respuesta; hasta entonces cada operación devuelve `contract-pending` en vez de inventar un
 * contrato. Falta definir: DTO de sala (materia, categoría, participantes, estado, horario),
 * búsqueda/filtros del catálogo (el plan dice "sin catálogo público"), ID/código de invitación y
 * errores (404 sala inexistente, 403 acción ajena).
 */
export class HttpRoomsService extends RoomsService {
  readonly isDemo = false;
  readonly joinHint = null;

  listMine(): Observable<Room[]> {
    return contractPending(`GET ${apiRoutes.rooms} (salas del usuario)`);
  }
  listAvailable(_query: RoomQuery): Observable<Room[]> {
    return contractPending(`GET ${apiRoutes.rooms} (catálogo de salas)`);
  }
  create(_request: CreateRoomRequest): Observable<Room> {
    return contractPending(`POST ${apiRoutes.rooms}`);
  }
  join(code: string): Observable<Room> {
    return contractPending(`POST ${apiRoutes.roomJoin(code)}`);
  }
  getById(id: string): Observable<Room> {
    return contractPending(`GET ${apiRoutes.room(id)}`);
  }
  remove(id: string): Observable<void> {
    return contractPending(`DELETE ${apiRoutes.room(id)}`);
  }
  update(id: string, _request: UpdateRoomRequest): Observable<Room> {
    return contractPending(`PATCH ${apiRoutes.room(id)}`);
  }
  leave(id: string): Observable<void> {
    return contractPending(`POST ${apiRoutes.roomLeave(id)}`);
  }
}
