import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { mockOk } from '../../../core/http/mock-latency';
import { ChangeEmailRequest, SettingsService } from '../services/settings.service';

/** DATOS DE DEMOSTRACIÓN: acepta el cambio sin enviar ningún correo real. */
@Injectable()
export class MockSettingsService extends SettingsService {
  readonly isDemo = true;
  changeEmail(_request: ChangeEmailRequest): Observable<void> {
    return mockOk(undefined);
  }
}
