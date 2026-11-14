/** Usuario de identidad (Firebase Auth). No contiene datos de perfil de negocio. */
export interface IdentityUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  provider: 'password' | 'google';
}

/** Perfil persistido por backend-api (`GET /api/v1/me`). */
export interface UserProfile {
  uid: string;
  nombres: string;
  apellidos: string;
  username: string;
  email: string;
  avatar: string;
  createdAt: string;
}

/** Cuerpo local para `POST /api/v1/me/complete` (crear perfil tras registro o primer acceso con Google). */
export interface CreateProfileRequest {
  nombres: string;
  apellidos: string;
  username: string;
  avatar: string;
}

export interface RegisterRequest extends CreateProfileRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Estado de sesión:
 * - `unknown`: Firebase aún no resolvió la sesión inicial (los guards esperan).
 * - `anonymous`: sin sesión.
 * - `incomplete`: identidad válida pero sin perfil (solo puede completar perfil o salir).
 * - `authenticated`: identidad y perfil completos.
 * - `unavailable`: identidad conservada; reintentar conexión con API.
 */
export type SessionStatus = 'unknown' | 'anonymous' | 'incomplete' | 'authenticated' | 'unavailable';

/** Avatares predefinidos mientras se confirma el formato definitivo del avatar. */
export const AVATAR_OPTIONS = ['peach', 'mint', 'sky', 'rose', 'lavender'] as const;
export type AvatarOption = (typeof AVATAR_OPTIONS)[number];

/** Contratos HTTP reales de backend-api: respuestas directas, sin envoltura data. */
export interface SessionResponse {
  uid: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  provider: 'password' | 'google.com';
  status: 'PENDING' | 'COMPLETE';
  profileComplete: boolean;
  nextAction: 'COMPLETE_PROFILE' | 'ENTER';
}
export interface ProfileResponse {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  avatar: string;
  status: 'COMPLETE';
  createdAt: string;
  updatedAt: string;
}
export interface CompleteProfileRequest {
  firstName: string;
  lastName: string;
  username: string;
  avatar: string;
}
