import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { BrandLogoComponent } from '../../atoms/brand-logo/brand-logo.component';
import { IconComponent } from '../../atoms/icon/icon.component';

export interface SidebarItem {
  label: string;
  icon: string;
  /** Ruta de la aplicación (`/dashboard`). */
  route: string;
  /** Punto coral de "actividad en curso" junto a la etiqueta. */
  live?: boolean;
  /** Contador (p. ej. mensajes sin leer); no se muestra si es 0. */
  badge?: number;
}

export interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

/** Barra lateral de navegación de las pantallas privadas. Presentacional: emite `logout` y `navigated`. */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [BrandLogoComponent, IconComponent, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-full flex-col px-5 py-6">
      <a routerLink="/" aria-label="StudyRoom, ir al inicio" class="mb-10 self-start rounded-xl px-1">
        <app-brand-logo [large]="true" />
      </a>

      <nav aria-label="Navegación principal" class="flex-1">
        @for (section of sections(); track section.title) {
          <p class="mb-3 mt-7 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted first:mt-0">{{ section.title }}</p>
          <ul class="space-y-2">
            @for (item of section.items; track item.route) {
              <li>
                <a
                  [routerLink]="item.route"
                  routerLinkActive="bg-surface-raised text-ink shadow-soft"
                  [routerLinkActiveOptions]="{ exact: false }"
                  #rla="routerLinkActive"
                  [attr.aria-current]="rla.isActive ? 'page' : null"
                  class="flex items-center gap-3.5 rounded-2xl px-4 py-3.5 text-[15px] font-medium text-muted transition hover:text-ink"
                  (click)="navigated.emit()"
                >
                  <app-icon [name]="item.icon" [size]="22" [class.text-primary]="rla.isActive" />
                  <span class="flex-1">{{ item.label }}</span>
                  @if (item.badge) {
                    <span class="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">{{ item.badge }}<span class="sr-only"> sin leer</span></span>
                  }
                  @if (item.live) {
                    <span class="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_4px_var(--color-primary-soft)]" aria-hidden="true"></span>
                    <span class="sr-only">en curso</span>
                  }
                </a>
              </li>
            }
          </ul>
        }
      </nav>

      <div class="mt-6 space-y-3">
        @if (streakTitle()) {
          <div class="flex items-center gap-3 rounded-2xl bg-surface-raised p-4 shadow-raised">
            <span class="neu-chip h-10 w-10 shrink-0 bg-lavender text-ink"><app-icon name="auto_awesome" [size]="20" /></span>
            <span class="min-w-0 leading-tight">
              <span class="block text-xs font-semibold text-ink">{{ streakTitle() }}</span>
              <span class="block truncate text-[11px] text-muted">{{ streakText() }}</span>
            </span>
          </div>
        }
        <button
          type="button"
          class="flex w-full items-center gap-3.5 rounded-2xl px-4 py-3 text-[15px] font-medium text-accent transition hover:bg-surface-raised"
          (click)="logout.emit()"
        >
          <app-icon name="logout" [size]="22" /> Cerrar sesión
        </button>
      </div>
    </div>
  `,
  host: { class: 'block h-full' }
})
export class SidebarComponent {
  readonly sections = input.required<SidebarSection[]>();
  readonly streakTitle = input<string | null>(null);
  readonly streakText = input<string | null>(null);
  readonly logout = output<void>();
  readonly navigated = output<void>();
}
