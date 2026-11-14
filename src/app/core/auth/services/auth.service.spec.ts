import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { runtimeConfig } from '../../config/runtime-config';
import { HttpAuthService } from './auth.service';
import { SKIP_AUTH_RECOVERY } from '../interceptors/auth-context';
import { ProfileResponse } from '../models/auth.models';

const profile: ProfileResponse = {uid:'uid',email:'ana@example.org',firstName:'Ana',lastName:'Pérez',username:'ana_01',
  avatar:'avatar-2',status:'COMPLETE',createdAt:'2026-11-14T00:00:00Z',updatedAt:'2026-11-14T00:00:00Z'};
describe('Published HTTP identity contract', () => {
  let http: HttpTestingController;
  let service: HttpAuthService;
  beforeEach(() => {
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),HttpAuthService]});
    http=TestBed.inject(HttpTestingController); service=TestBed.inject(HttpAuthService);
  });
  afterEach(() => http.verify());
  it('uses public HTTPS with real adapters and a separate health route', () => {
    expect(runtimeConfig.apiUrl).toBe('https://api.5-253-232-179.sslip.io/api/v1');
    expect(runtimeConfig.healthUrl).toBe('https://api.5-253-232-179.sslip.io/q/health/ready');
    expect(runtimeConfig.useMocks).toBeFalse(); expect(runtimeConfig.useFirebaseAuth).toBeTrue();
  });
  it('reads direct session JSON without /v1 duplication', () => {
    service.getSession().subscribe(s => expect(s.nextAction).toBe('COMPLETE_PROFILE'));
    http.expectOne(`${runtimeConfig.apiUrl}/session`).flush({nextAction:'COMPLETE_PROFILE'});
  });
  it('maps profile fields and avatar on direct GET responses', () => {
    service.getMe().subscribe(p => {expect(p.nombres).toBe('Ana');expect(p.apellidos).toBe('Pérez');expect(p.avatar).toBe('mint');});
    http.expectOne(`${runtimeConfig.apiUrl}/me`).flush(profile);
  });
  it('sends only the backend completion fields and maps the returned profile', () => {
    service.createProfile({nombres:' Ana ',apellidos:' Pérez ',username:' Ａｎａ_01 ',avatar:'mint'})
      .subscribe(p => expect(p.uid).toBe('uid'));
    const req=http.expectOne(`${runtimeConfig.apiUrl}/me/complete`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({firstName:'Ana',lastName:'Pérez',username:'Ana_01',avatar:'avatar-2'});
    req.flush(profile);
  });
  it('invalidates the token with 204 and disables recursive recovery on logout', () => {
    service.logout().subscribe(); const req=http.expectOne(`${runtimeConfig.apiUrl}/session/logout`);
    expect(req.request.method).toBe('POST'); expect(req.request.context.get(SKIP_AUTH_RECOVERY)).toBeTrue();
    req.flush(null,{status:204,statusText:'No Content'});
  });
  it('bounds an unresponsive session request so initialization can recover', fakeAsync(() => {
    let failed=false;
    service.getSession().subscribe({error:()=>{failed=true;}});
    const req=http.expectOne(`${runtimeConfig.apiUrl}/session`);
    tick(15001);expect(failed).toBeTrue();expect(req.cancelled).toBeTrue();
  }));

});
