import { Injectable, isDevMode, signal } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';

import { authGuard } from '../auth/guards/auth.guards';
import { UserProfile } from '../auth/models/auth.models';
import { runtimeConfig } from '../config/runtime-config';

/**
 * ACCESO DE DESARROLLO (temporal): permite revisar las pantallas privadas sin iniciar sesión.
 *
 * - Solo existe si `runtimeConfig.devAccess` es `true` Y la app corre en modo desarrollo
 *   (`isDevMode()`), por lo que queda inactivo en producción.
 * - NO toca `AuthStore`, los guards reales ni Firebase: es un indicador aparte en `sessionStorage`
 *   que solo consulta `privateRouteGuard`. Los servicios de datos usan mocks mientras está activo.
 * - Se activa/desactiva con recarga completa para que la inyección de dependencias elija los
 *   adaptadores correctos desde el arranque.
 *
 * Para retirarlo: borrar `core/dev/`, el `<app-dev-access-button>` del login, el uso de
 * `DevAccess` en `CurrentUser`/`*.providers.ts` y volver a `authGuard` en `app.routes.ts`.
 */
const STORAGE_KEY = 'frontmeet.dev-access';

export const DEV_PROFILE: UserProfile = {
  uid: 'dev-access',
  nombres: 'Marina',
  apellidos: 'López',
  username: 'marina.lopez',
  email: 'marina.lopez@universidad.edu',
  avatar: 'rose',
  createdAt: '2026-10-01T15:00:00Z'
};

/** `true` si el acceso de desarrollo está permitido en este build. */
export const devAccessAllowed = (): boolean => runtimeConfig.devAccess && isDevMode();

/** Lectura sin DI, para decidir proveedores durante el arranque. */
export function isDevAccessActive(): boolean {
  if (!devAccessAllowed()) return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class DevAccess {
  readonly allowed = devAccessAllowed();
  readonly active = signal(isDevAccessActive());
  /** Perfil de demostración; editable desde "Mi perfil" mientras dure la sesión de desarrollo. */
  readonly profile = signal<UserProfile>(DEV_PROFILE);

  /** Activa el modo y entra al panel con una recarga completa (reinicia la DI con los mocks). */
  enter(): void {
    if (!this.allowed) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      return;
    }
    location.assign('/dashboard');
  }

  exit(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* sin almacenamiento: nada que limpiar */
    }
    location.assign('/login');
  }
}

/** Sustituye a `authGuard` en las rutas privadas: deja pasar con el acceso de desarrollo activo. */
export const privateRouteGuard: CanActivateFn = (route, state) =>
  inject(DevAccess).active() ? true : authGuard(route, state);
