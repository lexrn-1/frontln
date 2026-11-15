import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '../../atoms/icon/icon.component';

export interface NotificationItemView {
  id: string;
  title: string;
  detail?: string;
  /** Texto de fecha ya formateado. */
  when: string;
  read: boolean;
}

/** Contenido del desplegable de notificaciones, con su estado vacío. Presentacional. */
@Component({
  selector: 'app-notification-panel',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-surface-raised p-4 shadow-raised">
      <h2 class="font-display text-sm font-semibold text-ink" id="notifications-title">Notificaciones</h2>
      @if (items().length === 0) {
        <div class="flex flex-col items-center px-4 py-8 text-center">
          <span class="neu-chip h-11 w-11 bg-primary-soft text-primary"><app-icon name="notifications_none" [size]="22" /></span>
          <p class="mt-3 text-[13px] font-semibold text-ink">Todo al día</p>
          <p class="mt-1 text-xs leading-relaxed text-muted">Aquí aparecerán los avisos de tus salas y sesiones.</p>
        </div>
      } @else {
        <ul class="mt-3 max-h-80 space-y-2 overflow-auto" aria-labelledby="notifications-title">
          @for (item of items(); track item.id) {
            <li class="rounded-xl bg-canvas p-3 shadow-inset">
              <p class="flex items-center gap-2 text-[13px] font-semibold text-ink">
                @if (!item.read) { <span class="h-1.5 w-1.5 rounded-full bg-primary" aria-label="Sin leer"></span> }
                {{ item.title }}
              </p>
              @if (item.detail) { <p class="mt-0.5 text-xs text-muted">{{ item.detail }}</p> }
              <p class="mt-1 text-[11px] text-muted">{{ item.when }}</p>
            </li>
          }
        </ul>
      }
    </div>
  `,
  host: { class: 'block' }
})
export class NotificationPanelComponent {
  readonly items = input<NotificationItemView[]>([]);
}
