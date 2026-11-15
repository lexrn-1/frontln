import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { FileLimits } from '../../../shared/utils/file-validation';
import { IconComponent } from '../../../shared/ui/atoms/icon/icon.component';
import { MessageComposerComponent, ComposerMessage } from '../../../shared/ui/organisms/message-composer/message-composer.component';
import { MessageAttachmentView, MessageListComponent, MessageView } from '../../../shared/ui/organisms/message-list/message-list.component';

/**
 * Chat compacto de la sala. Presentacional: muestra los mensajes que le pasa la página (que los
 * toma de `ChatStore`, el mismo historial que `/chats`) y emite las acciones.
 */
@Component({
  selector: 'app-chat-panel',
  standalone: true,
  imports: [IconComponent, MessageComposerComponent, MessageListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex h-full min-h-0 flex-col rounded-3xl bg-surface-raised p-5 shadow-raised" aria-labelledby="chat-title">
      <div class="flex items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 id="chat-title" class="text-[17px] font-medium text-ink">Chat de la sala</h2>
          <p class="mt-1 text-xs text-muted">{{ participantCount() === 1 ? '1 participante' : participantCount() + ' participantes' }}</p>
        </div>
        <button type="button" class="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:text-ink" aria-label="Cerrar chat" (click)="closed.emit()">
          <app-icon name="close" [size]="20" />
        </button>
      </div>

      <div class="mt-4 min-h-0 flex-1">
        <app-message-list
          [messages]="messages()" [state]="state()" [error]="error()" [hasMore]="hasMore()" [loadingOlder]="loadingOlder()"
          (loadOlder)="loadOlder.emit()" (retry)="retry.emit()" (download)="download.emit($event)"
        />
      </div>

      <app-message-composer class="mt-3" [limits]="limits()" [sending]="sending()" [error]="sendError()" [disabled]="state() !== 'ready'" (send)="send.emit($event)" />
    </section>
  `,
  host: { class: 'block h-full min-h-0' }
})
export class ChatPanelComponent {
  readonly messages = input<MessageView[]>([]);
  readonly state = input<'idle' | 'loading' | 'ready' | 'error'>('ready');
  readonly error = input<string | null>(null);
  readonly hasMore = input(false);
  readonly loadingOlder = input(false);
  readonly participantCount = input(0);
  readonly sending = input(false);
  readonly sendError = input<string | null>(null);
  readonly limits = input.required<FileLimits>();
  readonly send = output<ComposerMessage>();
  readonly loadOlder = output<void>();
  readonly retry = output<void>();
  readonly download = output<MessageAttachmentView>();
  readonly closed = output<void>();
}
