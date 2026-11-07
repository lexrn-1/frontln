import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, skip, take } from 'rxjs';

import { AppError } from '../../http/app-error';
import {
  CreateProfileRequest,
  IdentityUser,
  LoginRequest,
  RegisterRequest,
  SessionStatus,
  UserProfile
} from '../models/auth.models';
import { AuthService } from '../services/auth.service';
import { IdentityProvider } from '../services/identity-provider';

/**
 * Única fuente de verdad de la sesión: identidad, perfil y estado.
 * Flujo: Componente → AuthStore → (IdentityProvider | AuthService) → Firebase / HTTP.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly identity = inject(IdentityProvider);
  private readonly api = inject(AuthService);
  private readonly router = inject(Router);

  private readonly _status = signal<SessionStatus>('unknown');
  private readonly _user = signal<IdentityUser | null>(null);
  private readonly _profile = signal<UserProfile | null>(null);
  /** Datos de registro conservados si el perfil no pudo crearse (p. ej. username ocupado). */
  private readonly _draft = signal<Partial<CreateProfileRequest> | null>(null);

  readonly status = this._status.asReadonly();
  readonly user = this._user.asReadonly();
  readonly profile = this._profile.asReadonly();
  /** Borrador para completar perfil: lo conservado del registro o, si no, el nombre de la identidad. */
  readonly draft = computed<Partial<CreateProfileRequest> | null>(() => {
    const draft = this._draft();
    if (draft) return draft;
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

  /** Se ejecuta al arrancar (APP_INITIALIZER no bloqueante): resuelve la sesión inicial. */
  init(): void {
    this.identity.user$.pipe(take(1)).subscribe(async (user) => {
      try {
        await this.applyUser(user);
      } catch {
        // Sin API disponible se arranca como anónimo; la pantalla de login mostrará el error.
      } finally {
        this.resolveReady(this._status());
      }
    });
    // Cambios externos posteriores (expiración, cierre en otra pestaña con Firebase).
    this.identity.user$.pipe(skip(1)).subscribe((user) => {
      if (!user && this._status() !== 'anonymous') {
        this.clearState();
      }
    });
  }

  /** Espera la resolución inicial de Firebase; los guards la usan antes de decidir. */
  whenReady(): Promise<SessionStatus> {
    return this.ready;
  }

  /** US-01: registro con correo. Comprueba el username antes de crear la identidad. */
  async register(req: RegisterRequest): Promise<SessionStatus> {
    const { email, password, ...profile } = req;
    const availability = await firstValueFrom(this.api.checkUsername(profile.username));
    if (!availability.available) {
      throw usernameTaken();
    }

    const current = this._user();
    const user =
      current && current.email === email.trim().toLowerCase()
        ? current // Reintento tras un fallo parcial: la identidad ya existe.
        : await firstValueFrom(
            this.identity.signUpWithEmail(email, password, `${profile.nombres} ${profile.apellidos}`)
          );
    this._user.set(user);

    try {
      await this.createProfile(profile);
    } catch (error) {
      // La identidad existe pero el perfil no: se conserva lo escrito y queda "incompleto".
      this._draft.set(profile);
      this._status.set('incomplete');
      throw error;
    }
    return this._status();
  }

  /** US-03: ingreso con correo y contraseña. */
  async login(req: LoginRequest): Promise<SessionStatus> {
    const user = await firstValueFrom(this.identity.signInWithEmail(req.email, req.password));
    await this.applyUser(user);
    return this._status();
  }

  /** US-02 / US-03: Google. Si no hay perfil, el estado queda `incomplete`. */
  async loginWithGoogle(): Promise<SessionStatus> {
    const user = await firstValueFrom(this.identity.signInWithGoogle());
    await this.applyUser(user);
    return this._status();
  }

  /** Crear perfil (fin de registro o completar perfil tras Google). */
  async completeProfile(req: CreateProfileRequest): Promise<void> {
    await this.createProfile(req);
  }

  checkUsername(username: string) {
    return this.api.checkUsername(username);
  }

  /** Permite a otros módulos (sockets, peers, pistas) limpiar recursos al cerrar sesión. */
  registerTeardown(fn: () => void): () => void {
    this.teardowns.add(fn);
    return () => this.teardowns.delete(fn);
  }

  /** US-03: cierre de sesión con limpieza de estado y conexiones. */
  async logout(options: { reason?: 'expired'; returnUrl?: string } = {}): Promise<void> {
    this.teardowns.forEach((fn) => {
      try {
        fn();
      } catch {
        // Una limpieza fallida no debe impedir el cierre de sesión.
      }
    });
    await firstValueFrom(this.identity.signOut());
    this.clearState();
    const queryParams: Record<string, string> = {};
    if (options.reason) queryParams['motivo'] = options.reason;
    if (options.returnUrl) queryParams['returnUrl'] = options.returnUrl;
    await this.router.navigate(['/login'], { queryParams, replaceUrl: true });
  }

  getIdToken(forceRefresh = false) {
    return this.identity.getIdToken(forceRefresh);
  }

  private async createProfile(req: CreateProfileRequest): Promise<void> {
    const profile = await firstValueFrom(this.api.createProfile(req));
    this._profile.set(profile);
    this._draft.set(null);
    this._status.set('authenticated');
  }

  private async applyUser(user: IdentityUser | null): Promise<void> {
    if (!user) {
      this.clearState();
      return;
    }
    this._user.set(user);
    try {
      const profile = await firstValueFrom(this.api.getMe());
      this._profile.set(profile);
      this._status.set('authenticated');
    } catch (error) {
      const appError = AppError.from(error);
      if (appError.code === 'profile-not-found' || appError.status === 404) {
        this._profile.set(null);
        this._status.set('incomplete');
        return;
      }
      this.clearState();
      throw appError;
    }
  }

  private clearState(): void {
    this._user.set(null);
    this._profile.set(null);
    this._draft.set(null);
    this._status.set('anonymous');
  }
}

function usernameTaken(): AppError {
  return new AppError('username-taken', 'Este nombre de usuario ya está en uso.', 409, [
    { field: 'username', message: 'Este nombre de usuario ya está en uso.' }
  ]);
}
