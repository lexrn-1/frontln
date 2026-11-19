import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SocketRealtimeService } from './realtime.service';
import { IdentityProvider } from '../auth/services/identity-provider';
import { AuthStore } from '../auth/store/auth.store';

describe('Room admission acknowledgements', () => {
  it('does not overwrite newer microphone/presence deltas with a delayed admission ack', async () => {
    TestBed.configureTestingModule({
      providers: [
        SocketRealtimeService,
        { provide: IdentityProvider, useValue: { user$: of({ uid: 'u' }) } },
        { provide: AuthStore, useValue: { registerTeardown: () => undefined } },
      ],
    });
    const service = TestBed.inject(SocketRealtimeService);
    let ack!: Function;
    const callbacks = new Map<string, Function>();
    const socket: any = {
      connected: false,
      once: (event: string, fn: Function) => callbacks.set(event, fn),
      off: () => undefined,
      connect: () => {
        socket.connected = true;
        callbacks.get('connect')!();
      },
      timeout: () => ({ emit: (_event: string, _data: object, fn: Function) => (ack = fn) }),
      removeAllListeners: () => undefined,
      disconnect: () => undefined,
    };
    spyOn<any>(service, 'create').and.returnValue(socket);
    const joining = service.enter('room');
    await Promise.resolve();
    await Promise.resolve();
    const latest: any = {
      roomId: 'room',
      connectionId: 'self',
      participants: [{ connectionId: 'other', micOn: true }],
    };
    service.snapshot.set(latest);
    ack(null, { ok: true, data: { ...latest, participants: [{ connectionId: 'other', micOn: false }] } });
    expect((await joining).participants[0].micOn).toBeTrue();
    expect(service.snapshot()!.participants[0].micOn).toBeTrue();
    service.disconnect();
  });
});
