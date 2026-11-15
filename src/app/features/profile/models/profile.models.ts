import { UserProfile } from '../../../core/auth/models/auth.models';

/**
 * Datos académicos que muestra el prototipo (carrera y universidad). El contrato de backend
 * (`/me`, `/me/complete`) NO los incluye: hasta que se confirme, solo los guarda el mock
 * (docs/BACKEND-PENDING.md).
 */
export interface AcademicInfo {
  career: string | null;
  university: string | null;
}

/** Edición de perfil (US-04). El correo no se edita aquí: su cambio requiere reautenticación. */
export interface UpdateProfileRequest {
  nombres: string;
  apellidos: string;
  username: string;
  avatar: string;
  career: string;
  university: string;
}

export interface UpdateProfileResult {
  profile: UserProfile;
  academic: AcademicInfo;
}
