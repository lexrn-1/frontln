import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { runtimeConfig } from '../config/runtime-config';
import { AppError } from '../http/app-error';
import { Announcer } from '../layout/announcer.service';
import { httpErrorInterceptor } from './http-error.interceptor';

describe('httpErrorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let announcer: Announcer;
  const url = `${runtimeConfig.apiUrl}/rooms`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([httpErrorInterceptor])), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    announcer = TestBed.inject(Announcer);
  });

  const fail = (status: number, body: object | null = null, target = url): AppError => {
    let error!: AppError;
    http.get(target).subscribe({ error: (e) => (error = e) });
    backend.expectOne(target).flush(body, { status, statusText: 'x' });
    return error;
  };

  it('normalizes 400/422 with field errors and leaves them to the caller (no global notice)', () => {
    const e = fail(422, { code: 'VALIDATION_FAILED', message: 'Datos inválidos', fieldErrors: [{ field: 'name', message: 'Obligatorio' }] });
    expect(e instanceof AppError).toBeTrue();
    expect(e.code).toBe('validation-failed');
    expect(e.fieldErrors).toEqual([{ field: 'name', message: 'Obligatorio' }]);
    expect(announcer.message()).toBe('');
  });

  it('keeps 404 and 409 for the caller', () => {
    expect(fail(404).code).toBe('not-found');
    expect(fail(409).code).toBe('conflict');
    expect(announcer.message()).toBe('');
  });

  it('announces 403 once even if several requests fail together', () => {
    const spy = spyOn(announcer, 'announce');
    const e = fail(403);
    fail(403);
    expect(e.code).toBe('forbidden');
    expect(e.message).toContain('permiso');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.calls.mostRecent().args[1]).toBe('error');
  });

  it('maps 500 and network failures to understandable messages', () => {
    expect(fail(500).code).toBe('server');
    expect(fail(0).code).toBe('network');
  });

  it('does not touch errors from other origins', () => {
    let error: unknown;
    http.get('https://example.org/x').subscribe({ error: (e) => (error = e) });
    backend.expectOne('https://example.org/x').flush(null, { status: 500, statusText: 'x' });
    expect(error instanceof AppError).toBeFalse();
  });
});
