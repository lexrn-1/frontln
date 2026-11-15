import { Injectable, signal } from '@angular/core';

/** Sala pendiente de confirmar su eliminación. */
export interface RoomRemoval {
  id: string;
  name: string;
}

/**
 * Estado de los modales "Crear sala", "Unirse a una sala" y "Eliminar sala". Las pantallas piden
 * abrirlos desde aquí; el shell (`layouts/app-shell`) los pinta y los conecta con `RoomsStore`.
 * Así los modales se definen una sola vez y las features no se importan entre sí.
 */
@Injectable({ providedIn: 'root' })
export class RoomDialogs {
  readonly createOpen = signal(false);
  readonly joinOpen = signal(false);
  readonly removal = signal<RoomRemoval | null>(null);
  /** Sala cuyo nombre se está editando. */
  readonly edit = signal<RoomRemoval | null>(null);

  openCreate(): void {
    this.createOpen.set(true);
  }
  openJoin(): void {
    this.joinOpen.set(true);
  }
  openEdit(room: RoomRemoval): void {
    this.edit.set(room);
  }
  openRemove(room: RoomRemoval): void {
    this.removal.set(room);
  }
}
