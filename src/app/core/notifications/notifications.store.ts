import { Injectable, computed, signal } from '@angular/core';

/** Notificación a mostrar en el panel de la campana. */
export interface AppNotification {
  id: string;
  title: string;
  detail?: string;
  /** ISO 8601 UTC. */
  createdAt: string;
  read: boolean;
}

/**
 * Notificaciones de la campana. El plan de trabajo solo contempla avisos en vivo dentro de la sala
 * (entradas, salidas, mensajes) y no define endpoint ni evento de notificaciones del usuario, por
 * eso la lista nace vacía y no hay servicio: no se muestran eventos ficticios. Cuando backend
 * publique el contrato, un `NotificationsService` rellenará `items` desde aquí.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsStore {
  readonly items = signal<AppNotification[]>([]);
  readonly unreadCount = computed(() => this.items().filter((n) => !n.read).length);
}
