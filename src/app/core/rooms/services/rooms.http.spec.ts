import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpRoomsService } from './rooms.service';
import { runtimeConfig } from '../../config/runtime-config';
describe('Rooms HTTP adapter', () => {
  let api: HttpRoomsService, http: HttpTestingController;
  const room = {
    id: '40b4c52b-ab39-4f52-a897-322a175eaa97',
    name: 'Repaso',
    ownerUid: 'u',
    role: 'OWNER',
    status: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [HttpRoomsService],
    });
    api = TestBed.inject(HttpRoomsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('sends only the implemented name field and maps owner permissions', () => {
    api.create({ name: ' Repaso ', category: 'ciencias', schedule: null }).subscribe((value) => {
      expect(value.isHost).toBeTrue();
      expect(value.minimal).toBeTrue();
    });
    const request = http.expectOne(`${runtimeConfig.apiUrl}/rooms`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Repaso' });
    request.flush(room);
  });
  it('follows room pages without interpreting the opaque cursor', () => {
    api.listMine().subscribe((value) => expect(value.map((r) => r.id)).toEqual([room.id, 'another']));
    http
      .expectOne((r) => r.url.endsWith('/rooms') && !r.params.has('cursor'))
      .flush({ items: [room], nextCursor: 'opaque+cursor' });
    http
      .expectOne((r) => r.params.get('cursor') === 'opaque+cursor')
      .flush({ items: [{ ...room, id: 'another' }], nextCursor: null });
  });
  it('deletes using the API lifecycle endpoint and accepts 202', () => {
    api.remove(room.id).subscribe();
    const request = http.expectOne(`${runtimeConfig.apiUrl}/rooms/${room.id}`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 202, statusText: 'Accepted' });
  });
});
