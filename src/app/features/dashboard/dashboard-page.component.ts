import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthStore } from '../../core/auth/store/auth.store';
import { AvatarComponent } from '../../shared/ui/atoms/avatar/avatar.component';
import { BrandLogoComponent } from '../../shared/ui/atoms/brand-logo/brand-logo.component';
import { IconComponent } from '../../shared/ui/atoms/icon/icon.component';
import { SpinnerComponent } from '../../shared/ui/atoms/spinner/spinner.component';

/**
 * Destino privado tras el login (ruta `/dashboard`, protegida por `authGuard`).
 * En Sprint 1 solo confirma la sesión; el panel completo (salas, agenda) llega en Sprint 2.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [AvatarComponent, BrandLogoComponent, IconComponent, RouterLink, SpinnerComponent],
  template: `
    <header class="flex items-center justify-between gap-4 px-4 py-5 sm:px-8">
      <a routerLink="/" aria-label="StudyRoom, inicio" class="rounded-xl"><app-brand-logo /></a>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 rounded-xl bg-surface-raised py-1.5 pl-1.5 pr-3 shadow-soft">
          <app-avatar [name]="auth.displayName()" [tone]="auth.profile()?.avatar ?? 'peach'" [size]="30" />
          <span class="text-left leading-tight">
            <span class="block text-[13px] font-semibold text-ink">{{ auth.displayName() }}</span>
            <span class="block text-[11px] text-muted">&#64;{{ auth.profile()?.username }}</span>
          </span>
        </div>
        <button type="button" class="btn-ghost h-10 text-primary" [disabled]="leaving()" (click)="logout()">
          @if (leaving()) { <app-spinner /> } @else { <app-icon name="logout" [size]="18" /> }
          Cerrar sesión
        </button>
      </div>
    </header>

    <main id="contenido" tabindex="-1" class="mx-auto max-w-5xl px-4 pb-16 outline-none sm:px-8">
      <h1 class="mt-4 text-[28px] font-semibold text-ink">Hola, {{ auth.profile()?.nombres }}</h1>
      <p class="mt-1 text-sm text-muted">¿Lista para avanzar con tus objetivos de hoy?</p>

      <section class="mt-8 rounded-[28px] bg-surface-raised p-8 shadow-raised" aria-labelledby="empty-title">
        <span class="neu-chip h-11 w-11 bg-primary-soft text-primary">
          <app-icon name="meeting_room" [size]="22" />
        </span>
        <h2 id="empty-title" class="mt-5 text-xl font-semibold text-ink">Aún no tienes salas</h2>
        <p class="mt-2 max-w-md text-sm text-muted">
          Tu sesión está activa. La creación de salas y el panel completo llegan en el Sprint 2.
        </p>
        <button type="button" class="btn-primary mt-6" disabled aria-describedby="empty-title">
          <app-icon name="add" [size]="18" /> Crear una sala
        </button>
      </section>
    </main>
  `
})
export class DashboardPageComponent {
  protected readonly auth = inject(AuthStore);
  protected readonly leaving = signal(false);

  protected logout(): void {
    this.leaving.set(true);
    void this.auth.logout();
  }
}
