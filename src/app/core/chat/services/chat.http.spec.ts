import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { CurrentUser } from '../../auth/store/current-user.store';
import { RealtimeService } from '../../realtime/realtime.service';
import { RoomsService } from '../../rooms/services/rooms.service';
import { Announcer } from '../../layout/announcer.service';
import { httpErrorInterceptor } from '../../interceptors/http-error.interceptor';
import { HttpChatService } from './chat.service';

describe('History routing fallback', () => {
  let api: HttpChatService, http: HttpTestingController, request: jasmine.Spy;
  beforeEach(() => {
    request = jasmine.createSpy().and.resolveTo({ items: [], nextCursor: null });
    TestBed.configureTestingModule({
      providers: [
        HttpChatService,
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: CurrentUser, useValue: { profile: signal({ uid: 'u' }) } },
        { provide: RoomsService, useValue: {} },
        { provide: RealtimeService, useValue: { request } },
        { provide: Announcer, useValue: { announce: () => undefined } },
      ],
    });
    api = TestBed.inject(HttpChatService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('uses authenticated socket history when the gateway returns 404, including normalized interceptor errors', async () => {
    const page = firstValueFrom(api.listMessages('room', { limit: 30, before: 'opaque' }));
    http
      .expectOne((r) => r.url.endsWith('/rooms/room/messages'))
      .flush({ message: 'Recurso no existe' }, { status: 404, statusText: 'Not Found' });
    expect((await page).messages).toEqual([]);
    expect(request).toHaveBeenCalledOnceWith('chat:history', 'room', { limit: 30, before: 'opaque' });
  });
  for (const status of [401, 403, 503])
    it(`does not bypass a ${status} using the socket fallback`, async () => {
      const page = firstValueFrom(api.listMessages('room', { limit: 30 })).catch((error) => error);
      http
        .expectOne((r) => r.url.endsWith('/rooms/room/messages'))
        .flush({ message: 'Error' }, { status, statusText: 'Error' });
      expect((await page).status).toBe(status);
      expect(request).not.toHaveBeenCalled();
    });
});
