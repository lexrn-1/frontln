import { Provider } from '@angular/core';

import { runtimeConfig } from '../../core/config/runtime-config';
import { isDevAccessActive } from '../../core/dev/dev-access';
import { MockProfileService } from './mocks/mock-profile.service';
import { HttpProfileService, ProfileService } from './services/profile.service';

/** Se registra en la ruta `/perfil`. Mocks con `useMocks` o acceso de desarrollo; HTTP (pendiente) si no. */
export function provideProfile(): Provider[] {
  const useMock = runtimeConfig.useMocks || isDevAccessActive();
  return [{ provide: ProfileService, useClass: useMock ? MockProfileService : HttpProfileService }];
}
