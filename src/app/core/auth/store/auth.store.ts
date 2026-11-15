import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, skip, take } from 'rxjs';
import { AppError } from '../../http/app-error';
import { CreateProfileRequest, IdentityUser, LoginRequest, RegisterRequest, SessionStatus, UserProfile } from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import { IdentityProvider } from '../services/identity-provider';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly identity = inject(IdentityProvider);
  private readonly api = inject(AuthService);
  private readonly router = inject(Router);
  private readonly _status = signal<SessionStatus>('unknown');
  private readonly _user = signal<IdentityUser | null>(null);
  private readonly _profile = signal<UserProfile | null>(null);
  private readonly _draft = signal<Partial<CreateProfileRequest> | null>(null);
  readonly sessionError = signal<string | null>(null);
  readonly usernameConflict = signal<string | null>(null);
  readonly status = this._status.asReadonly();
  readonly user = this._user.asReadonly();
  readonly profile = this._profile.asReadonly();
  readonly draft = computed<Partial<CreateProfileRequest> | null>(() => {
    if (this._draft()) return this._draft();
    const name = this._user()?.displayName?.trim();
    if (!name) return null;
    const [nombres, ...rest] = name.split(/\s+/);
    return { nombres, apellidos: rest.join(' ') };
  });
  readonly isAuthenticated = computed(() => this._status() === 'authenticated');
  readonly displayName = computed(() => {
    const p = this._profile();
    return p ? `${p.nombres} ${p.apellidos}` : (this._user()?.displayName ?? '');
  });
  private readonly teardowns = new Set<() => void>();
  private resolveReady!: (status: SessionStatus) => void;
  private readonly ready = new Promise<SessionStatus>((resolve) => (this.resolveReady = resolve));
  private loggingOut = false;

  init(): void {
    this.identity.user$.pipe(take(1)).subscribe({
      next: async (user) => {
        try { await this.applyUser(user); }
        catch { /* applyUser preserves a retryable unavailable state. */ }
        finally { this.resolveReady(this._status()); }
      },
      error: (error: unknown) => {
        this.clearState(); this.sessionError.set(AppError.from(error).message); this.resolveReady(this._status());
      }
    });
    this.identity.user$.pipe(skip(1)).subscribe({
      next: (user) => { if (!user) this.clearState(); },
      error: () => { this.clearState(); }
    });
  }
  whenReady(): Promise<SessionStatus> { return this.ready; }
  async retrySession(): Promise<SessionStatus> {
    const user = this._user() ?? await firstValueFrom(this.identity.user$.pipe(take(1)));
    await this.applyUser(user); return this._status();
  }
  async register(req: RegisterRequest): Promise<SessionStatus> {
    this.sessionError.set(null); this.usernameConflict.set(null);
    const { email, password, ...profile } = req;
    this._draft.set(profile);
    const current = this._user();
    const user = current && current.email.toLowerCase() === email.trim().toLowerCase()
      ? current : await firstValueFrom(this.identity.signUpWithEmail(email, password, `${profile.nombres} ${profile.apellidos}`));
    this._user.set(user); this._status.set('incomplete');
    try { await this.createProfile(profile); }
    catch (error) {
      this._draft.set(profile); this._status.set('incomplete');
      if (AppError.from(error).code === 'username-taken') this.usernameConflict.set(profile.username);
      throw AppError.from(error);
    }
    return this._status();
  }
  async login(req: LoginRequest): Promise<SessionStatus> {
    this.sessionError.set(null);
    await this.applyUser(await firstValueFrom(this.identity.signInWithEmail(req.email, req.password)));
    return this._status();
  }
  async loginWithGoogle(): Promise<SessionStatus> {
    this.sessionError.set(null);
    await this.applyUser(await firstValueFrom(this.identity.signInWithGoogle()));
    return this._status();
  }
  async completeProfile(req: CreateProfileRequest): Promise<void> { await this.createProfile(req); }
  /** Sustituye el perfil en memoria tras una edición confirmada por el servidor (Mi perfil). */
  applyProfile(profile: UserProfile): void { if (this._user()?.uid === profile.uid) this._profile.set(profile); }
  registerTeardown(fn: () => void): () => void { this.teardowns.add(fn); return () => this.teardowns.delete(fn); }
  async logout(options: { reason?: 'expired'; returnUrl?: string; revokeRemote?: boolean } = {}): Promise<void> {
    if (this.loggingOut) return;
    this.loggingOut = true;
    this.sessionError.set(null);
    try {
      this.teardowns.forEach((fn) => { try { fn(); } catch { /* Continue cleanup. */ } });
      if (options.revokeRemote !== false && this._user()) {
        try { await firstValueFrom(this.api.logout()); }
        catch { this.sessionError.set('Se cerró la sesión local, pero no pudimos confirmar su invalidación en el servidor.'); }
      }
    } finally {
      try { await firstValueFrom(this.identity.signOut()); }
      catch { this.sessionError.set('No pudimos confirmar el cierre en Firebase. Intenta cerrar sesión de nuevo.'); }
      finally {
        this.clearState(); this.loggingOut = false;
        const queryParams: Record<string, string> = {};
        if (options.reason) queryParams['motivo'] = options.reason;
        if (options.returnUrl) queryParams['returnUrl'] = options.returnUrl;
        await this.router.navigate(['/login'], { queryParams, replaceUrl: true });
      }
    }
  }
  getIdToken(forceRefresh = false) { return this.identity.getIdToken(forceRefresh); }
  private async createProfile(req: CreateProfileRequest): Promise<void> {
    const uid = this._user()?.uid;
    try {
      const profile = await firstValueFrom(this.api.createProfile(req));
      if (!uid || this._user()?.uid !== uid) return;
      this._profile.set(profile); this._draft.set(null); this.usernameConflict.set(null);
      this.sessionError.set(null); this._status.set('authenticated');
    } catch (error) {
      const problem = AppError.from(error);
      // Recover a prior committed completion after an unknown/timeout response; never overwrite it.
      if (problem.code === 'profile-already-complete' && this._user()) {
        await this.applyUser(this._user());
        if (this._status() === 'authenticated') return;
      }
      throw problem;
    }
  }
  private async applyUser(user: IdentityUser | null): Promise<void> {
    this.sessionError.set(null);
    if (!user) { this.clearState(); return; }
    this._user.set(user); this._profile.set(null);
    try {
      const session = await firstValueFrom(this.api.getSession());
      if (this._user()?.uid !== user.uid) return;
      if (!session.profileComplete || session.nextAction === 'COMPLETE_PROFILE') {
        this._status.set('incomplete'); return;
      }
      const profile = await firstValueFrom(this.api.getMe());
      if (this._user()?.uid !== user.uid) return;
      this._profile.set(profile);
      this._status.set('authenticated'); this._draft.set(null);
    } catch (error) {
      const problem = AppError.from(error);
      if (this._user()?.uid !== user.uid) return;
      if (problem.code === 'profile-incomplete') { this._status.set('incomplete'); return; }
      if (problem.status === 401) this.clearState();
      else this._status.set('unavailable');
      this.sessionError.set(problem.message); throw problem;
    }
  }
  private clearState(): void {
    this._user.set(null); this._profile.set(null); this._draft.set(null);
    this.usernameConflict.set(null); this._status.set('anonymous');
  }
}
