import { Routes } from '@angular/router';

import { authGuard, guestGuard, incompleteProfileGuard } from './core/auth/guards/auth.guards';

/**
 * Rutas de Sprint 0–1 (plan de trabajo). Pendientes para sprints siguientes:
 * `/perfil` (Sprint 2) y `/salas/:id` (Sprint 3), ambas con `authGuard`.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Estudiar juntos lo cambia todo',
    loadComponent: () => import('./features/landing/landing-page.component').then((m) => m.LandingPageComponent)
  },
  {
    path: 'registro',
    title: 'Crear cuenta',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./core/auth/components/register/register-page.component').then((m) => m.RegisterPageComponent)
  },
  {
    path: 'login',
    title: 'Iniciar sesión',
    canActivate: [guestGuard],
    loadComponent: () => import('./core/auth/components/login/login-page.component').then((m) => m.LoginPageComponent)
  },
  {
    path: 'completar-perfil',
    title: 'Completar perfil',
    canActivate: [incompleteProfileGuard],
    loadComponent: () =>
      import('./core/auth/components/complete-profile/complete-profile-page.component').then(
        (m) => m.CompleteProfilePageComponent
      )
  },
  {
    path: 'dashboard',
    title: 'Inicio',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent)
  },
  { path: '**', redirectTo: '' }
];
