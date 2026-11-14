import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { AuthStore } from './auth.store';
import { AuthService } from '../services/auth.service';
import { IdentityProvider } from '../services/identity-provider';
import { AppError } from '../../http/app-error';
import { authGuard, guestGuard, incompleteProfileGuard } from '../guards/auth.guards';

const user={uid:'uid',email:'ana@example.org',displayName:'Ana Pérez',photoUrl:null,provider:'password' as const};
const profile={uid:'uid',email:user.email,nombres:'Ana',apellidos:'Pérez',username:'ana',avatar:'mint',createdAt:'now'};
describe('Session lifecycle with real backend states',()=>{
  let api:jasmine.SpyObj<AuthService>;let identity:jasmine.SpyObj<IdentityProvider>;let router:jasmine.SpyObj<Router>;let store:AuthStore;
  beforeEach(()=>{
    api=jasmine.createSpyObj('api',['getSession','getMe','createProfile','logout']);
    api.getSession.and.returnValue(of({uid:'uid',email:user.email,displayName:user.displayName,photoUrl:null,provider:'password',
      status:'PENDING',profileComplete:false,nextAction:'COMPLETE_PROFILE'}));
    api.getMe.and.returnValue(of(profile));api.createProfile.and.returnValue(of(profile));api.logout.and.returnValue(of(undefined));
    identity=jasmine.createSpyObj('identity',['signInWithEmail','signInWithGoogle','signUpWithEmail','signOut','getIdToken'],{user$:of(user)});
    identity.signInWithEmail.and.returnValue(of(user));identity.signInWithGoogle.and.returnValue(of({...user,provider:'google' as const}));
    identity.signUpWithEmail.and.returnValue(of(user));identity.signOut.and.returnValue(of(undefined));
    router=jasmine.createSpyObj('router',['navigate','createUrlTree']);router.navigate.and.resolveTo(true);router.createUrlTree.and.returnValue({} as never);
    TestBed.configureTestingModule({providers:[AuthStore,{provide:AuthService,useValue:api},{provide:IdentityProvider,useValue:identity},{provide:Router,useValue:router}]});
    store=TestBed.inject(AuthStore);
  });
  it('restores PENDING using /session without requesting the forbidden /me resource',async()=>{
    store.init();expect(await store.whenReady()).toBe('incomplete');expect(api.getMe).not.toHaveBeenCalled();
    const allowed=await TestBed.runInInjectionContext(()=>incompleteProfileGuard({} as never,{} as never));expect(allowed).toBeTrue();
    await TestBed.runInInjectionContext(()=>authGuard({} as never,{url:'/dashboard'} as never));
    expect(router.createUrlTree).toHaveBeenCalledWith(['/completar-perfil'],{queryParams:{returnUrl:'/dashboard'}});
  });
  it('routes a complete Google login through the server session and loads the profile',async()=>{
    api.getSession.and.returnValue(of({uid:'uid',email:user.email,displayName:null,photoUrl:null,provider:'google.com',status:'COMPLETE',profileComplete:true,nextAction:'ENTER'}));
    expect(await store.loginWithGoogle()).toBe('authenticated');expect(store.profile()?.nombres).toBe('Ana');
  });
  it('unblocks guards and offers retry when session restoration fails',async()=>{
    api.getSession.and.returnValue(throwError(()=>new AppError('dependency-unavailable','Reintentar',503)));
    store.init();expect(await store.whenReady()).toBe('unavailable');expect(store.sessionError()).toBe('Reintentar');
    expect(await TestBed.runInInjectionContext(()=>guestGuard({} as never,{} as never))).toBeTrue();
    api.getSession.and.returnValue(of({uid:'uid',email:user.email,displayName:null,photoUrl:null,provider:'password',status:'PENDING',profileComplete:false,nextAction:'COMPLETE_PROFILE'}));
    expect(await store.retrySession()).toBe('incomplete');expect(store.sessionError()).toBeNull();
  });
  it('preserves the registration draft and reuses the Firebase identity after a collision',async()=>{
    api.createProfile.and.returnValue(throwError(()=>new AppError('username-taken','Ocupado',409)));
    const request={email:user.email,password:'not-persisted',nombres:'Ana',apellidos:'Pérez',username:'ana',avatar:'mint'};
    await expectAsync(store.register(request)).toBeRejected();expect(store.draft()?.username).toBe('ana');expect(store.status()).toBe('incomplete');
    api.createProfile.and.returnValue(of(profile));await store.register({...request,username:'ana2'});
    expect(identity.signUpWithEmail).toHaveBeenCalledTimes(1);expect(store.status()).toBe('authenticated');
  });
  it('always clears local state when server logout fails',async()=>{
    await store.login({email:user.email,password:'test'});api.logout.and.returnValue(throwError(()=>new AppError('server','Unavailable',503)));
    await store.logout();expect(identity.signOut).toHaveBeenCalled();expect(store.status()).toBe('anonymous');
    expect(store.sessionError()).toContain('no pudimos confirmar');expect(api.logout).toHaveBeenCalledBefore(identity.signOut);
  });
  it('skips backend invalidation after an interceptor has already rejected the session',async()=>{
    await store.login({email:user.email,password:'test'});await store.logout({revokeRemote:false});
    expect(api.logout).not.toHaveBeenCalled();expect(identity.signOut).toHaveBeenCalled();
  });
  it('ignores a delayed profile response after logout',async()=>{
    api.getSession.and.returnValue(of({uid:'uid',email:user.email,displayName:null,photoUrl:null,provider:'password',status:'COMPLETE',profileComplete:true,nextAction:'ENTER'}));
    const delayed = new Subject<typeof profile>(); api.getMe.and.returnValue(delayed);
    const login=store.login({email:user.email,password:'test'});
    await Promise.resolve(); await Promise.resolve();
    await store.logout(); delayed.next(profile); delayed.complete(); await login;
    expect(store.status()).toBe('anonymous');expect(store.profile()).toBeNull();
  });

});
