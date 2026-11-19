import { runtimeConfig } from '../../../core/config/runtime-config';
import { CdkMenu, CdkMenuItem, CdkMenuTrigger } from '@angular/cdk/menu';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IconComponent } from '../../../shared/ui/atoms/icon/icon.component';

/**
 * Barra inferior de la sala. Micrófono y cámara usan captura local; "Compartir" presenta tu pantalla y
 * "Tablero" abre la pizarra en el escenario, pantalla se transmite por WebRTC; tablero queda deshabilitado en este alcance.
 */
@Component({
  selector: 'app-controls-bar',
  standalone: true,
  imports: [CdkMenu, CdkMenuItem, CdkMenuTrigger, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="-mx-3 -mb-3 flex items-center justify-between gap-2 border-t border-border px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-4 sm:-mb-4 sm:gap-3 sm:px-5 sm:py-3"
    >
      <p class="hidden min-w-0 items-center gap-2.5 sm:flex">
        <span class="neu-chip h-11 w-11 bg-lavender text-ink"><app-icon name="group" [size]="20" /></span>
        <span class="leading-tight">
          <span class="block text-[13px] font-semibold text-ink">{{ participantCount() }} en la sala</span>
          <span class="block text-[11px] text-muted">Sesión privada</span>
        </span>
      </p>

      <div class="mx-auto flex items-center gap-1.5 sm:mx-0 sm:gap-2" role="toolbar" aria-label="Controles de la sala">
        <button
          type="button"
          class="ctl"
          [class.ctl-off]="!micOn()"
          [attr.aria-pressed]="!micOn()"
          [attr.aria-label]="micOn() ? 'Silenciar micrófono' : 'Activar micrófono'"
          (click)="toggleMic.emit()"
        >
          <app-icon [name]="micOn() ? 'mic' : 'mic_off'" [size]="20" /><span class="ctl-label">Micrófono</span>
        </button>
        <button
          type="button"
          class="ctl"
          [class.ctl-off]="!cameraOn()"
          [attr.aria-pressed]="!cameraOn()"
          [attr.aria-label]="cameraOn() ? 'Apagar cámara' : 'Encender cámara'"
          (click)="toggleCamera.emit()"
        >
          <app-icon [name]="cameraOn() ? 'photo_camera' : 'no_photography'" [size]="20" /><span class="ctl-label"
            >Cámara</span
          >
        </button>
        <button
          type="button"
          class="ctl"
          [class.ctl-on]="sharing()"
          [attr.aria-pressed]="sharing()"
          [attr.aria-label]="sharing() ? 'Dejar de compartir pantalla' : 'Compartir pantalla'"
          (click)="toggleScreen.emit()"
        >
          <app-icon [name]="sharing() ? 'cancel_presentation' : 'present_to_all'" [size]="20" /><span class="ctl-label"
            >Compartir</span
          >
        </button>
        <button
          type="button"
          class="ctl"
          [class.ctl-on]="boardOpen()"
          [attr.aria-pressed]="boardOpen()"
          [attr.aria-label]="boardOpen() ? 'Cerrar tablero' : 'Abrir tablero'"
          [disabled]="!boardEnabled"
          [attr.title]="boardEnabled ? null : 'Tablero pendiente'"
          (click)="toggleBoard.emit()"
        >
          <app-icon name="draw" [size]="20" /><span class="ctl-label">Tablero</span>
        </button>
        <button
          type="button"
          class="ctl"
          [class.ctl-on]="chatOpen()"
          [attr.aria-pressed]="chatOpen()"
          aria-label="Mostrar u ocultar el chat"
          (click)="toggleChat.emit()"
        >
          <app-icon name="chat_bubble" [size]="20" /><span class="ctl-label">Chat</span>
        </button>
        <button type="button" class="ctl ctl-leave" aria-label="Salir de la sala" (click)="leave.emit()">
          <app-icon name="logout" [size]="20" /><span class="ctl-label">Salir</span>
        </button>
      </div>

      <button
        type="button"
        class="btn-ghost h-11 shrink-0 gap-1.5 px-3 sm:px-4"
        [cdkMenuTriggerFor]="more"
        aria-label="Más opciones"
      >
        <app-icon name="more_horiz" [size]="20" />
        <span class="hidden sm:inline">Más</span>
      </button>
    </div>

    <ng-template #more>
      <div
        cdkMenu
        class="min-w-60 rounded-xl bg-surface-raised p-1.5 shadow-raised"
        aria-label="Más opciones de la sala"
      >
        <button cdkMenuItem type="button" class="menu-item" (click)="copyCode.emit()">
          <app-icon name="content_copy" [size]="16" /> Copiar código de invitación
        </button>
        <button cdkMenuItem type="button" class="menu-item" (click)="openChats.emit()">
          <app-icon name="forum" [size]="16" /> Abrir en Chats
        </button>
        <button cdkMenuItem type="button" class="menu-item text-primary" (click)="leave.emit()">
          <app-icon name="logout" [size]="16" /> Salir de la sala
        </button>
      </div>
    </ng-template>
  `,
  styles: `
    .ctl {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      min-width: 2.375rem;
      height: 3.25rem;
      padding: 0 0.125rem;
      border-radius: 0.875rem;
      color: var(--color-ink);
      background: var(--color-surface-raised);
      box-shadow: var(--shadow-soft);
      transition: box-shadow var(--duration-micro) var(--ease-out);
    }
    @media (min-width: 640px) {
      .ctl {
        min-width: 3.25rem;
        padding: 0 0.5rem;
      }
    }
    .ctl:active {
      box-shadow: var(--shadow-pressed);
    }
    .ctl-label {
      font-size: 9px;
      font-weight: 600;
      color: var(--color-muted);
    }
    .ctl-off {
      color: var(--color-danger);
    }
    .ctl-on {
      color: var(--color-primary);
      box-shadow: var(--shadow-pressed);
      outline: 1.5px solid var(--color-primary);
      outline-offset: -1.5px;
    }
    .ctl-leave {
      background: var(--color-primary);
      color: #fff;
      box-shadow: var(--shadow-primary);
    }
    .ctl-leave .ctl-label {
      color: #fff;
    }
    .menu-item {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 0.5rem;
      border-radius: 0.5rem;
      padding: 0.5rem 0.75rem;
      text-align: left;
      font-size: 13px;
      font-weight: 500;
      color: var(--color-ink);
    }
    .menu-item:hover:not(:disabled),
    .menu-item:focus-visible {
      background: var(--color-surface);
    }
    .menu-item:disabled {
      color: var(--color-muted);
      cursor: not-allowed;
    }
  `,
  host: { class: 'block' },
})
export class ControlsBarComponent {
  protected readonly boardEnabled = runtimeConfig.features.boardApi;
  readonly participantCount = input(0);
  readonly micOn = input(true);
  readonly cameraOn = input(true);
  readonly sharing = input(false);
  readonly boardOpen = input(false);
  readonly chatOpen = input(true);
  readonly toggleMic = output<void>();
  readonly toggleCamera = output<void>();
  readonly toggleScreen = output<void>();
  readonly toggleBoard = output<void>();
  readonly toggleChat = output<void>();
  readonly leave = output<void>();
  readonly copyCode = output<void>();
  readonly openChats = output<void>();
}
