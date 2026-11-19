import { signal } from '@angular/core';
import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { RoomMediaStateService } from './room-media-state.service';

describe('Room device state delivery', () => {
  let service: RoomMediaStateService, request: jasmine.Spy, snapshot: ReturnType<typeof signal<any>>;
  beforeEach(() => {
    snapshot = signal({ roomId: 'room', connectionId: 'old' });
    request = jasmine.createSpy().and.resolveTo({});
    TestBed.configureTestingModule({
      providers: [
        RoomMediaStateService,
        { provide: RealtimeService, useValue: { status: signal('connected'), snapshot, request } },
      ],
    });
    service = TestBed.inject(RoomMediaStateService);
    TestBed.flushEffects();
  });
  it('retries a failed ack instead of silently losing the microphone state', fakeAsync(() => {
    request.and.returnValues(Promise.reject(new Error('temporary')), Promise.resolve({}));
    service.publish('room', { micOn: true, camOn: false, screenSharing: false });
    flushMicrotasks();
    expect(service.error()).toBeTruthy();
    tick(1000);
    flushMicrotasks();
    expect(request).toHaveBeenCalledTimes(2);
    expect(service.error()).toBeNull();
  }));
  it('coalesces changes in flight and republishes the latest state after reconnect', fakeAsync(() => {
    let resolve!: (value: object) => void;
    request.and.returnValue(new Promise((r) => (resolve = r)));
    service.publish('room', { micOn: false, camOn: false, screenSharing: false });
    service.publish('room', { micOn: true, camOn: false, screenSharing: false });
    request.and.resolveTo({});
    resolve({});
    flushMicrotasks();
    expect(request.calls.mostRecent().args[2].micOn).toBeTrue();
    const calls = request.calls.count();
    snapshot.set({ roomId: 'room', connectionId: 'new' });
    TestBed.flushEffects();
    flushMicrotasks();
    expect(request.calls.count()).toBe(calls + 1);
    expect(request.calls.mostRecent().args[2].micOn).toBeTrue();
  }));
  it('does not retry or restore state after leaving the room', fakeAsync(() => {
    request.and.rejectWith(new Error('temporary'));
    service.publish('room', { micOn: true, camOn: false, screenSharing: false });
    flushMicrotasks();
    service.clear();
    tick(1000);
    flushMicrotasks();
    expect(request).toHaveBeenCalledTimes(1);
    expect(service.error()).toBeNull();
  }));
});
