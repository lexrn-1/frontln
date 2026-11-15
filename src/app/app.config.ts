import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { APP_INITIALIZER, ApplicationConfig, inject } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { TitleStrategy, provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideAuth } from './core/auth/auth.providers';
import { authTokenInterceptor } from './core/auth/interceptors/auth-token.interceptor';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { AuthStore } from './core/auth/store/auth.store';
import { provideChat } from './core/chat/chat.providers';
import { provideRealtime } from './core/realtime/realtime.service';
import { provideRooms } from './core/rooms/rooms.providers';
import { provideStudyStats } from './core/study/study.providers';
import { runtimeConfig } from './core/config/runtime-config';
import { startAnalytics } from './core/firebase/firebase-app';
import { PageTitleStrategy } from './core/layout/page-title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })),
    { provide: TitleStrategy, useClass: PageTitleStrategy },
    provideAnimations(),
    provideHttpClient(withInterceptors([httpErrorInterceptor, authTokenInterceptor])),
    ...provideAuth(),
    ...provideRooms(),
    ...provideStudyStats(),
    ...provideChat(),
    ...provideRealtime(),
    {
      // Arranca la resolución de sesión sin bloquear el render; los guards la esperan.
      provide: APP_INITIALIZER,
      multi: true,
      useFactory: () => {
        const store = inject(AuthStore);
        return () => store.init();
      }
    },
    ...(runtimeConfig.useFirebaseAuth
      ? [{ provide: APP_INITIALIZER, multi: true, useFactory: () => () => void startAnalytics() }]
      : [])
  ]
};
