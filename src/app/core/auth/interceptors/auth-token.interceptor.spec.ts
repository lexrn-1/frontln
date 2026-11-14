import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { runtimeConfig } from '../../config/runtime-config';
import { IdentityProvider } from '../services/identity-provider';
import { AuthStore } from '../store/auth.store';
import { authTokenInterceptor } from './auth-token.interceptor';
import { SKIP_AUTH_RECOVERY } from './auth-context';

describe('Bearer scope and recovery', () => {
  let http:HttpTestingController; let client:HttpClient; let tokens:jasmine.Spy; let logout:jasmine.Spy;
  beforeEach(() => {
    tokens=jasmine.createSpy().and.callFake((refresh=false)=>of(refresh?'fresh':'current'));
    logout=jasmine.createSpy().and.resolveTo();
    TestBed.configureTestingModule({providers:[provideHttpClient(withInterceptors([authTokenInterceptor])),provideHttpClientTesting(),
      {provide:IdentityProvider,useValue:{getIdToken:tokens}}, {provide:AuthStore,useValue:{logout}},
      {provide:Router,useValue:{url:'/dashboard'}}]});
    http=TestBed.inject(HttpTestingController);client=TestBed.inject(HttpClient);
  });
  afterEach(()=>http.verify());
  it('never leaks Bearer to readiness, demo, third parties or similar path prefixes',()=>{
    const urls=[runtimeConfig.healthUrl,`${runtimeConfig.apiUrl}/demo`,'https://other.example/api/v1/me',`${runtimeConfig.apiUrl}-other/me`];
    for(const url of urls){client.get(url).subscribe();const req=http.expectOne(url);expect(req.request.headers.has('Authorization')).toBeFalse();req.flush({});}
    expect(tokens).not.toHaveBeenCalled();
  });
  it('refreshes once on 401 and propagates a second failure without recursively calling remote logout',()=>{
    client.get(`${runtimeConfig.apiUrl}/me`).subscribe({error:()=>{}});
    const first=http.expectOne(`${runtimeConfig.apiUrl}/me`);expect(first.request.headers.get('Authorization')).toBe('Bearer current');
    first.flush({}, {status:401,statusText:'Unauthorized'});
    const retry=http.expectOne(`${runtimeConfig.apiUrl}/me`);expect(retry.request.headers.get('Authorization')).toBe('Bearer fresh');
    retry.flush({}, {status:401,statusText:'Unauthorized'});
    expect(tokens).toHaveBeenCalledTimes(2);expect(logout).toHaveBeenCalledOnceWith({reason:'expired',returnUrl:'/dashboard',revokeRemote:false});
  });
  it('sends the logout token but never refreshes or initiates another logout',()=>{
    client.post(`${runtimeConfig.apiUrl}/session/logout`,null,{context:new HttpContext().set(SKIP_AUTH_RECOVERY,true)}).subscribe({error:()=>{}});
    const req=http.expectOne(`${runtimeConfig.apiUrl}/session/logout`);expect(req.request.headers.get('Authorization')).toBe('Bearer current');
    req.flush({}, {status:401,statusText:'Unauthorized'});expect(tokens).toHaveBeenCalledTimes(1);expect(logout).not.toHaveBeenCalled();
  });
  it('does not refresh or log out on a profile authorization error',()=>{
    client.get(`${runtimeConfig.apiUrl}/me`).subscribe({error:()=>{}});
    http.expectOne(`${runtimeConfig.apiUrl}/me`).flush({}, {status:403,statusText:'Forbidden'});
    expect(tokens).toHaveBeenCalledTimes(1);expect(logout).not.toHaveBeenCalled();
  });
});
