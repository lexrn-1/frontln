import { Routes } from '@angular/router';

import { guestGuard, incompleteProfileGuard } from './core/auth/guards/auth.guards';
// Las rutas privadas usan `privateRouteGuard`, que equivale a `authGuard` salvo cuando el acceso de
// desarrollo (core/dev) está activo. Al retirarlo, volver a importar `authGuard` y usarlo aquí.
import { privateRouteGuard } from './core/dev/dev-access';
import type { ShellHeaderData } from './layouts/app-shell/app-shell.component';
import { provideProfile } from './features/profile/profile.providers';
import { provideSettings } from './features/settings/settings.providers';
import { provideStudyRoom } from './features/study-room/study-room.providers';

/** Cabecera del shell por pantalla (ver `ShellHeaderData`). */
const header = (data: ShellHeaderData) => ({ header: data });

/**
 * Rutas del plan de trabajo: /registro, /login, /completar-perfil, /dashboard, /perfil y
 * /salas/:id, más /explorar y /configuracion de las capturas de referencia. Las pantallas con
 * navegación lateral cuelgan del shell; la sala de estudio va a pantalla completa.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Estudiar juntos lo cambia todo',
    loadComponent: () => import('./features/landing/landing-page.component').then((m) => m.LandingPageComponent),
  },
  {
    path: 'registro',
    title: 'Crear cuenta',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./core/auth/components/register/register-page.component').then((m) => m.RegisterPageComponent),
  },
  {
    path: 'login',
    title: 'Iniciar sesión',
    canActivate: [guestGuard],
    loadComponent: () => import('./core/auth/components/login/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: 'completar-perfil',
    title: 'Completar perfil',
    canActivate: [incompleteProfileGuard],
    loadComponent: () =>
      import('./core/auth/components/complete-profile/complete-profile-page.component').then(
        (m) => m.CompleteProfilePageComponent
      ),
  },
  {
    path: '',
    canActivate: [privateRouteGuard],
    loadComponent: () => import('./layouts/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: 'dashboard',
        title: 'Inicio',
        data: header({ title: 'Inicio', subtitle: '¿Lista para avanzar con tus objetivos de hoy?', greeting: true }),
        loadComponent: () =>
          import('./features/dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent),
      },
      {
        path: 'explorar',
        redirectTo: 'dashboard',
      },
      {
        path: 'chats',
        title: 'Chats',
        data: header({ title: 'Chats', subtitle: 'Tus conversaciones de estudio, en un solo lugar.' }),
        loadComponent: () => import('./features/chats/chats-page.component').then((m) => m.ChatsPageComponent),
      },
      {
        path: 'chats/:roomId',
        title: 'Conversación',
        data: header({ title: 'Chats', subtitle: 'Tus conversaciones de estudio, en un solo lugar.' }),
        loadComponent: () => import('./features/chats/chats-page.component').then((m) => m.ChatsPageComponent),
      },
      {
        path: 'perfil',
        title: 'Mi perfil',
        data: header({ title: 'Mi perfil', subtitle: 'Gestiona tu información personal y tu progreso.' }),
        providers: [provideProfile()],
        loadComponent: () => import('./features/profile/profile-page.component').then((m) => m.ProfilePageComponent),
      },
      {
        path: 'configuracion',
        title: 'Configuración',
        data: header({ title: 'Configuración', subtitle: 'Personaliza StudyRoom para que funcione a tu manera.' }),
        providers: [provideSettings()],
        loadComponent: () => import('./features/settings/settings-page.component').then((m) => m.SettingsPageComponent),
      },
    ],
  },
  {
    path: 'salas/:id',
    title: 'Sala de estudio',
    canActivate: [privateRouteGuard],
    providers: [provideStudyRoom()],
    loadComponent: () =>
      import('./features/study-room/study-room-page.component').then((m) => m.StudyRoomPageComponent),
  },
  {
    path: '**',
    title: 'Página no encontrada',
    loadComponent: () => import('./features/not-found/not-found-page.component').then((m) => m.NotFoundPageComponent),
  },
];
