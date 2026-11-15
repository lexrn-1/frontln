import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CurrentUser } from '../../../core/auth/store/current-user.store';
import { AppError } from '../../../core/http/app-error';
import { mockFail, mockOk } from '../../../core/http/mock-latency';
import { AcademicInfo, UpdateProfileRequest, UpdateProfileResult } from '../models/profile.models';
import { ProfileService } from '../services/profile.service';

/** Usernames que el "servidor" simulado trata como ocupados, para ver el error de conflicto. */
const TAKEN_USERNAMES = ['admin', 'studyroom'];

/** DATOS DE DEMOSTRACIÓN del perfil (en memoria). */
@Injectable()
export class MockProfileService extends ProfileService {
  readonly isDemo = true;
  private readonly user = inject(CurrentUser);
  private academic: AcademicInfo = { career: 'Ingeniería Biomédica', university: 'Universidad Complutense' };

  getAcademicInfo(): Observable<AcademicInfo> {
    return mockOk({ ...this.academic });
  }

  update(request: UpdateProfileRequest): Observable<UpdateProfileResult> {
    const current = this.user.profile();
    if (!current) return mockFail(new AppError('unauthorized', 'Sesión no válida.', 401));
    const username = request.username.normalize('NFKC').trim();
    if (TAKEN_USERNAMES.includes(username.toLowerCase())) {
      return mockFail(
        new AppError('username-taken', 'Este nombre de usuario ya está en uso.', 409, [
          { field: 'username', message: 'Este nombre de usuario ya está en uso.' }
        ])
      );
    }
    this.academic = { career: request.career.trim() || null, university: request.university.trim() || null };
    return mockOk({
      profile: {
        ...current,
        nombres: request.nombres.trim(),
        apellidos: request.apellidos.trim(),
        username,
        avatar: request.avatar
      },
      academic: { ...this.academic }
    });
  }

  deleteAccount(): Observable<void> {
    return mockOk(undefined);
  }
}
