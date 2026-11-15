import { Provider } from '@angular/core';

import { runtimeConfig } from '../config/runtime-config';
import { isDevAccessActive } from '../dev/dev-access';
import { MockRoomsService } from './services/mock-rooms.service';
import { HttpRoomsService, RoomsService } from './services/rooms.service';

/** Mocks con `useMocks` o con el acceso de desarrollo activo; HTTP en cualquier otro caso. */
export function provideRooms(): Provider[] {
  const useMock = runtimeConfig.useMocks || isDevAccessActive();
  return [{ provide: RoomsService, useClass: useMock ? MockRoomsService : HttpRoomsService }];
}
