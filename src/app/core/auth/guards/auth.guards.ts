import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStore } from '../store/auth.store';

/**
 * Los guards solo mejoran la experiencia: el servidor decide uid, permisos y pertenencia.
 * Todos esperan la resolución inicial de la sesión antes de decidir.
 */

/** Rutas privadas: exige sesión y perfil completo. Conserva la URL destino. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const store = inject(AuthStore);
  const router = inject(Router);
  const status = await store.whenReady().then(() => store.status());

  if (status === 'authenticated') return true;
  const queryParams = { returnUrl: state.url };
  return status === 'incomplete'
    ? router.createUrlTree(['/completar-perfil'], { queryParams })
    : router.createUrlTree(['/login'], { queryParams });
};

/** Login y registro: solo sin sesión. */
export const guestGuard: CanActivateFn = async () => {
  const store = inject(AuthStore);
  const router = inject(Router);
  const status = await store.whenReady().then(() => store.status());

  if (status === 'anonymous') return true;
  return router.createUrlTree([status === 'incomplete' ? '/completar-perfil' : '/dashboard']);
};

/** Completar perfil: solo con identidad válida y sin perfil. */
export const incompleteProfileGuard: CanActivateFn = async () => {
  const store = inject(AuthStore);
  const router = inject(Router);
  const status = await store.whenReady().then(() => store.status());

  if (status === 'incomplete') return true;
  return router.createUrlTree([status === 'authenticated' ? '/dashboard' : '/login']);
};
