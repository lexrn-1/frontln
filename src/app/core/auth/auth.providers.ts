import { Provider } from '@angular/core';

import { runtimeConfig } from '../config/runtime-config';
import { AuthService, HttpAuthService } from './services/auth.service';
import { FirebaseIdentityProvider } from './services/firebase-identity.provider';
import { IdentityProvider } from './services/identity-provider';
import { MockAuthService } from './services/mock/mock-auth.service';
import { MockIdentityProvider } from './services/mock/mock-identity.provider';

/** Elige adaptadores reales o simulados según `useFirebaseAuth` (identidad) y `useMocks` (API). */
export function provideAuth(): Provider[] {
  const { useFirebaseAuth, useMocks } = runtimeConfig;
  return [
    { provide: IdentityProvider, useClass: useFirebaseAuth ? FirebaseIdentityProvider : MockIdentityProvider },
    { provide: AuthService, useClass: useMocks ? MockAuthService : HttpAuthService }
  ];
}
