import { Provider } from '@angular/core';

import { runtimeConfig } from '../../core/config/runtime-config';
import { isDevAccessActive } from '../../core/dev/dev-access';
import { MockSettingsService } from './mocks/mock-settings.service';
import { HttpSettingsService, SettingsService } from './services/settings.service';

/** Se registra en la ruta `/configuracion`. */
export function provideSettings(): Provider[] {
  const useMock = runtimeConfig.useMocks || isDevAccessActive();
  return [{ provide: SettingsService, useClass: useMock ? MockSettingsService : HttpSettingsService }];
}
