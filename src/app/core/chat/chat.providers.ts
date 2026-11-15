import { Provider } from '@angular/core';

import { runtimeConfig } from '../config/runtime-config';
import { isDevAccessActive } from '../dev/dev-access';
import { FilesService, HttpFilesService } from '../files/files.service';
import { MockFilesService } from '../files/mock-files.service';
import { MockChatService } from './mocks/mock-chat.service';
import { ChatService, HttpChatService } from './services/chat.service';

/** Mocks con `useMocks` o acceso de desarrollo; adaptadores HTTP (inactivos hasta confirmar contrato) si no. */
export function provideChat(): Provider[] {
  const useMock = runtimeConfig.useMocks || isDevAccessActive();
  return [
    { provide: ChatService, useClass: useMock ? MockChatService : HttpChatService },
    { provide: FilesService, useClass: useMock ? MockFilesService : HttpFilesService }
  ];
}
