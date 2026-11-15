import { Observable } from 'rxjs';

import { apiRoutes } from '../../../core/config/api-routes';
import { contractPending } from '../../../core/http/contract-pending';
import { AcademicInfo, UpdateProfileRequest, UpdateProfileResult } from '../models/profile.models';

/** Administración del perfil de un usuario ya registrado (sin estado). Ver `ProfileStore`. */
export abstract class ProfileService {
  abstract readonly isDemo: boolean;
  abstract getAcademicInfo(): Observable<AcademicInfo>;
  abstract update(request: UpdateProfileRequest): Observable<UpdateProfileResult>;
  /** US-05: borra la cuenta; el cliente cierra sesión después de la confirmación del backend. */
  abstract deleteAccount(): Observable<void>;
}

/**
 * Adaptador HTTP sin contrato todavía. Falta que backend defina: método y cuerpo de la edición
 * (¿`PUT`/`PATCH ${apiRoutes.me}`?), campos de carrera y universidad, cambio de username con
 * unicidad, y el endpoint de borrado de cuenta. No se inventan: cada operación devuelve
 * `contract-pending`.
 */
export class HttpProfileService extends ProfileService {
  readonly isDemo = false;

  getAcademicInfo(): Observable<AcademicInfo> {
    return contractPending(`Datos académicos en ${apiRoutes.me} (campos no definidos)`);
  }
  update(_request: UpdateProfileRequest): Observable<UpdateProfileResult> {
    return contractPending(`Edición de perfil sobre ${apiRoutes.me}`);
  }
  deleteAccount(): Observable<void> {
    return contractPending('Borrado de cuenta (US-05, endpoint no definido)');
  }
}
