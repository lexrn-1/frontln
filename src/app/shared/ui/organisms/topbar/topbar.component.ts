import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AvatarComponent } from '../../atoms/avatar/avatar.component';
import { IconComponent } from '../../atoms/icon/icon.component';
import { NotificationItemView, NotificationPanelComponent } from '../notification-panel/notification-panel.component';

/**
 * Cabecera de las pantallas privadas: título de la página, campana de notificaciones y perfil.
 * En pantallas pequeñas muestra el botón que abre el menú lateral. Presentacional.
 */
@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [AvatarComponent, CdkConnectedOverlay, CdkOverlayOrigin, IconComponent, NotificationPanelComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex items-center justify-between gap-3 border-b border-border px-4 py-5 sm:px-12 sm:py-6">
      <div class="flex min-w-0 items-center gap-3">
        <button
          type="button"
          class="neu-chip h-10 w-10 shrink-0 bg-surface-raised text-ink transition active:shadow-pressed lg:hidden"
          aria-label="Abrir menú de navegación"
          [attr.aria-expanded]="menuOpen()"
          (click)="menuToggle.emit()"
        >
          <app-icon name="menu" [size]="20" />
        </button>
        <div class="min-w-0">
          <h1 class="truncate font-display text-xl font-medium leading-tight tracking-tight text-ink sm:text-[28px]">{{ title() }}</h1>
          @if (subtitle()) {
            <p class="mt-1 truncate text-sm text-muted">{{ subtitle() }}</p>
          }
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2.5">
        <button
          type="button"
          cdkOverlayOrigin
          #origin="cdkOverlayOrigin"
          class="neu-chip relative h-11 w-11 bg-surface-raised text-ink transition active:shadow-pressed"
          [attr.aria-label]="unreadCount() ? 'Notificaciones, ' + unreadCount() + ' sin leer' : 'Notificaciones'"
          aria-haspopup="dialog"
          [attr.aria-expanded]="panelOpen()"
          (click)="panelOpen.set(!panelOpen())"
        >
          <app-icon name="notifications" [size]="21" />
          @if (unreadCount() > 0) {
            <span class="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-primary" aria-hidden="true"></span>
          }
        </button>
        <ng-template
          cdkConnectedOverlay
          [cdkConnectedOverlayOrigin]="origin"
          [cdkConnectedOverlayOpen]="panelOpen()"
          [cdkConnectedOverlayPositions]="[{ originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 }]"
          [cdkConnectedOverlayHasBackdrop]="true"
          cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
          (backdropClick)="panelOpen.set(false)"
          (detach)="panelOpen.set(false)"
        >
          <div role="dialog" aria-labelledby="notifications-title" (keydown.escape)="panelOpen.set(false)">
            <app-notification-panel [items]="notifications()" />
          </div>
        </ng-template>

        <a
          routerLink="/perfil"
          class="flex items-center gap-3 rounded-2xl bg-surface-raised py-2 pl-2 pr-3.5 shadow-soft transition active:shadow-pressed"
          [attr.aria-label]="'Mi perfil, ' + userName()"
        >
          <app-avatar [name]="userName()" [tone]="avatarTone()" [size]="34" />
          <span class="hidden text-left leading-tight sm:block">
            <span class="block text-[13px] font-semibold text-ink">{{ userName() }}</span>
            <span class="block text-[11px] text-muted">{{ userRole() }}</span>
          </span>
          <app-icon name="chevron_right" [size]="16" class="hidden text-muted sm:inline-flex" />
        </a>
      </div>
    </header>
  `
})
export class TopbarComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string | null>(null);
  readonly userName = input('');
  readonly userRole = input('Estudiante');
  readonly avatarTone = input('peach');
  readonly unreadCount = input(0);
  readonly notifications = input<NotificationItemView[]>([]);
  readonly menuOpen = input(false);
  readonly menuToggle = output<void>();

  protected readonly panelOpen = signal(false);
}
