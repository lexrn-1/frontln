import {RoomWire} from '../models/room.dto';
import {toRoom} from '../models/room.mapper';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, of, expand, reduce, EMPTY } from 'rxjs';
import { runtimeConfig } from '../../config/runtime-config';
import { Observable } from 'rxjs';

import { apiRoutes } from '../../config/api-routes';
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

  abstract update(id: string, request: UpdateRoomRequest): Observable<Room>;

  abstract leave(id: string): Observable<void>;
  /** Eliminar solo está permitido al anfitrión (el servidor responde 403 en otro caso). */
  abstract remove(id: string): Observable<void>;
}

@Injectable()
export class HttpRoomsService extends RoomsService {
  readonly isDemo = false;
  readonly joinHint = null;

  private readonly http = inject(HttpClient);
  private readonly base = runtimeConfig.apiUrl;
  listMine(): Observable<Room[]> {
    return this.list('owned');
  }
  list(scope: 'owned' | 'member'): Observable<Room[]> {
    const page = (cursor?: string) =>
      this.http.get<{ items: RoomWire[]; nextCursor: string | null }>(`${this.base}/rooms`, {
        params: cursor
          ? new HttpParams().set('scope', scope).set('limit', 50).set('cursor', cursor)
          : new HttpParams().set('scope', scope).set('limit', 50),
      });
    return page().pipe(
      expand((p) => (p.nextCursor ? page(p.nextCursor) : EMPTY)),
      reduce((all, p) => [...all, ...p.items.map(toRoom)], [] as Room[])
    );
  }
  listAvailable(_query: RoomQuery): Observable<Room[]> {
    return of([]);
  }
  create(request: CreateRoomRequest): Observable<Room> {
    return this.http.post<RoomWire>(`${this.base}/rooms`, { name: request.name.trim() }).pipe(map(toRoom));
  }
  join(code: string): Observable<Room> {
    return this.http.post<RoomWire>(`${this.base}${apiRoutes.roomJoin(code)}`, {}).pipe(map(toRoom));
  }
  getById(id: string): Observable<Room> {
    return this.http.get<RoomWire>(`${this.base}${apiRoutes.room(id)}`).pipe(map(toRoom));
  }
  update(id: string, request: UpdateRoomRequest): Observable<Room> {
    return this.http
      .patch<RoomWire>(`${this.base}${apiRoutes.room(id)}`, {
        name: request.name.trim(),
      })
      .pipe(map(toRoom));
  }
  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}${apiRoutes.room(id)}`);
  }
  // Salir cierra la presencia; conserva la membresía y el historial.
  leave(_id: string): Observable<void> {
    return of(undefined);
  }
}
