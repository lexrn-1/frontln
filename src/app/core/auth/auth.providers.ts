import { Provider } from '@angular/core';

import { runtimeConfig } from '../config/runtime-config';
import { AuthService, HttpAuthService } from './services/auth.service';
import { FirebaseIdentityProvider } from './services/firebase-identity.provider';
import { IdentityProvider } from './services/identity-provider';
import { MockAuthService } from './services/mock/mock-auth.service';
import { MockIdentityProvider } from './services/mock/mock-identity.provider';

/** Elige adaptadores reales o simulados según `runtimeConfig.useMocks`. */
export function provideAuth(): Provider[] {
  const mocks = runtimeConfig.useMocks;
  return [
    { provide: IdentityProvider, useClass: mocks ? MockIdentityProvider : FirebaseIdentityProvider },
    { provide: AuthService, useClass: mocks ? MockAuthService : HttpAuthService }
  ];
}
