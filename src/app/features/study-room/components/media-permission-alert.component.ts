import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { IconComponent } from '../../../shared/ui/atoms/icon/icon.component';
import { SpinnerComponent } from '../../../shared/ui/atoms/spinner/spinner.component';
import { MediaPermission } from '../services/media.service';

/** Invita a activar cámara y micrófono, o explica cómo habilitarlos si se denegaron (US-12). */
@Component({
  selector: 'app-media-permission-alert',
  standalone: true,
  imports: [IconComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (permission() !== 'granted') {
      <div class="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs sm:gap-3 sm:px-4 sm:py-3" [class]="isProblem() ? 'bg-danger-soft text-danger' : 'bg-surface-raised text-ink shadow-soft'" [attr.role]="isProblem() ? 'alert' : 'region'" aria-label="Cámara y micrófono">
        <app-icon [name]="isProblem() ? 'videocam_off' : 'videocam'" [size]="20" />
        <p class="min-w-0 flex-1 font-medium">
          @if (message()) { {{ message() }} }
          @else {
            <span class="sm:hidden">Activa tu cámara y micrófono.</span>
            <span class="hidden sm:inline">Activa tu cámara y tu micrófono para que se vean y se escuchen cuando la conexión en tiempo real esté disponible. Puedes seguir usando el chat sin ellos.</span>
          }
        </p>
        @if (permission() !== 'unsupported') {
          <button type="button" class="btn-ghost h-9 shrink-0 px-3 text-xs" [disabled]="permission() === 'requesting'" (click)="activate.emit()">
            @if (permission() === 'requesting') { <app-spinner [size]="12" /> Solicitando… } @else { {{ isProblem() ? 'Reintentar' : 'Activar' }}<span class="max-sm:sr-only">{{ isProblem() ? '' : ' cámara y micrófono' }}</span> }
          </button>
        }
      </div>
    }
  `,
  host: { class: 'block' }
})
export class MediaPermissionAlertComponent {
  readonly permission = input<MediaPermission>('idle');
  readonly message = input<string | null>(null);
  readonly activate = output<void>();
  protected readonly isProblem = () => ['denied', 'unavailable', 'unsupported'].includes(this.permission());
}
