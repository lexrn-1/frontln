import { fakeAsync, tick } from '@angular/core/testing';
import { Observable } from 'rxjs';

import { AppError } from '../../http/app-error';
import { HttpRoomsService } from './rooms.service';
import { MockRoomsService } from './mock-rooms.service';

/** Resuelve un Observable simulado avanzando el reloj falso. */
function run<T>(source: Observable<T>): { value?: T; error?: unknown } {
  const result: { value?: T; error?: unknown } = {};
  source.subscribe({
    next: (v) => (result.value = v),
    error: (e) => (result.error = e),
  });
  tick(2000);
  return result;
}

describe('MockRoomsService (demo data)', () => {
  it('filters the catalogue by text ignoring accents and by category', fakeAsync(() => {
    const api = new MockRoomsService();
    expect(run(api.listAvailable({ text: 'calculo', category: 'all' })).value?.map((r) => r.id)).toEqual(['SR-8462']);
    expect(run(api.listAvailable({ text: '', category: 'idiomas' })).value?.length).toBe(1);
    expect(run(api.listAvailable({ text: 'zzz', category: 'all' })).value).toEqual([]);
  }));

  it('creates a room as host and rejects a repeated name', fakeAsync(() => {
    const api = new MockRoomsService();
    const room = run(
      api.create({
        name: 'Repaso Física',
        category: 'ciencias',
        schedule: null,
      })
    ).value!;
    expect(room.isHost).toBeTrue();
    expect(room.id).toMatch(/^SR-[A-Z0-9]{4}$/);
    expect(room.category).toBe('ciencias');
    expect(room.status).toBe('idle');
    expect(
      (
        run(
          api.create({
            name: 'repaso física',
            category: 'ciencias',
            schedule: null,
          })
        ).error as AppError
      ).code
    ).toBe('room-name-taken');
  }));

  it('creates a scheduled room with its next occurrence', fakeAsync(() => {
    const api = new MockRoomsService();
    const room = run(
      api.create({
        name: 'Algoritmos',
        category: 'programacion',
        schedule: { frequency: 'daily', time: '23:59' },
      })
    ).value!;
    expect(room.status).toBe('scheduled');
    expect(room.startsAt).toBeTruthy();
    expect(room.schedule?.frequency).toBe('daily');
  }));

  it('joins with a normalized code and reports unknown codes', fakeAsync(() => {
    const api = new MockRoomsService();
    const joined = run(api.join(' sr7qx2 ')).value!;
    expect(joined.isMember).toBeTrue();
    expect(run(api.listMine()).value?.some((r) => r.id === 'SR-7QX2')).toBeTrue();
    expect((run(api.join('SR-ZZZZ')).error as AppError).status).toBe(404);
  }));

  it('only the host can remove a room', fakeAsync(() => {
    const api = new MockRoomsService();
    expect((run(api.remove('SR-3D9F')).error as AppError).status).toBe(403);
    expect(run(api.remove('SR-8462')).error).toBeUndefined();
  }));
});
