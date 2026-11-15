import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';

import { ChatStore } from '../../core/chat/store/chat.store';
import { runtimeConfig } from '../../core/config/runtime-config';
import { Announcer } from '../../core/layout/announcer.service';
import { isPlausibleRoomId } from '../../core/rooms/room-code';
import { AvatarComponent } from '../../shared/ui/atoms/avatar/avatar.component';
import { IconComponent } from '../../shared/ui/atoms/icon/icon.component';
import { EmptyStateComponent } from '../../shared/ui/molecules/empty-state/empty-state.component';
import { ComposerMessage, MessageComposerComponent } from '../../shared/ui/organisms/message-composer/message-composer.component';
import { MessageAttachmentView, MessageListComponent } from '../../shared/ui/organisms/message-list/message-list.component';
import { saveBlob } from '../../shared/utils/download';
import { ConversationListComponent } from './components/conversation-list.component';

/**
 * Centro de conversaciones (`/chats` y `/chats/:roomId`), al estilo de un chat web. Es OTRA
 * interfaz sobre el mismo `ChatStore` que usa el chat integrado en la sala: mismos mensajes,
 * historial, archivos y no leídos. En móvil se muestra primero la lista y, al elegir, la conversación.
 */
@Component({
  selector: 'app-chats-page',
  standalone: true,
  imports: [AvatarComponent, ConversationListComponent, EmptyStateComponent, IconComponent, MessageComposerComponent, MessageListComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto grid h-[calc(100dvh-10.5rem)] min-h-[26rem] max-w-6xl gap-4 sm:gap-5 lg:h-[calc(100dvh-13rem)] lg:grid-cols-[360px_minmax(0,1fr)]">
      @if (chat.isDemo) {
        <p class="rounded-xl bg-warning-soft px-4 py-2 text-xs font-medium text-warning max-lg:hidden lg:col-span-2" role="note">
          Conversaciones de demostración. El historial vive en el mismo almacén que el chat de la sala; el tiempo real está pendiente de integración.
        </p>
      }

      <section class="min-h-0 rounded-[28px] bg-surface-raised p-4 shadow-raised" [class]="roomId() ? 'hidden lg:block' : 'block'" aria-label="Lista de conversaciones">
        <h2 class="sr-only">Conversaciones</h2>
        <app-conversation-list
          [conversations]="chat.conversations()" [state]="chat.conversationsState()" [error]="chat.conversationsError()"
          [selectedId]="roomId()" (select)="open($event)" (retry)="chat.loadConversations()"
        />
      </section>

      <section class="min-h-0 flex-col rounded-[28px] bg-surface-raised p-4 shadow-raised sm:p-5" [class]="roomId() ? 'flex' : 'hidden lg:flex'" aria-label="Conversación">
        @if (!roomId()) {
          <app-empty-state icon="forum" title="Elige una conversación" text="Selecciona una sala de la lista para ver y escribir mensajes." />
        } @else if (blocked()) {
          <app-empty-state tone="error" icon="lock" title="No puedes ver esta conversación" [text]="blocked()">
            <a routerLink="/chats" class="btn-primary h-10">Volver a mis chats</a>
          </app-empty-state>
        } @else {
          <header class="flex items-center gap-3 border-b border-border pb-4">
            <button type="button" class="neu-chip h-10 w-10 shrink-0 bg-surface-raised text-ink lg:hidden" aria-label="Volver a la lista de conversaciones" (click)="back()"><app-icon name="chevron_left" [size]="20" /></button>
            @if (conversation(); as c) {
              <app-avatar [name]="c.name" [tone]="c.tone" [size]="44" />
              <div class="min-w-0 flex-1 leading-tight">
                <h1 class="truncate text-[17px] font-medium text-ink">{{ c.name }}</h1>
                <p class="text-xs text-muted">{{ c.participantCount === 1 ? '1 participante' : c.participantCount + ' participantes' }}@if (c.subject) { · {{ c.subject }} }</p>
              </div>
            } @else {
              <h1 class="flex-1 text-[17px] font-medium text-ink">Conversación</h1>
            }
            <a [routerLink]="['/salas', roomId()]" class="btn-ghost h-10 shrink-0 px-3 text-xs"><app-icon name="videocam" [size]="16" /> <span class="hidden sm:inline">Abrir sala</span><span class="sr-only sm:hidden">Abrir sala</span></a>
          </header>

          <div class="min-h-0 flex-1 py-4">
            <h2 class="sr-only">Mensajes</h2>
            <app-message-list
              [messages]="room().messages" [state]="room().state" [error]="room().error" [hasMore]="!!room().nextCursor" [loadingOlder]="room().loadingOlder"
              label="Mensajes de la conversación" emptyText="Esta conversación aún no tiene mensajes. Escribe el primero."
              (loadOlder)="chat.loadOlder(roomId()!)" (retry)="chat.open(roomId()!)" (download)="download($event)"
            />
          </div>
          <app-message-composer [limits]="limits" [sending]="room().sending" [error]="room().sendError" [disabled]="room().state !== 'ready'" (send)="send($event)" />
        }
      </section>
    </div>
  `
})
export class ChatsPageComponent implements OnInit {
  protected readonly chat = inject(ChatStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly announcer = inject(Announcer);

  protected readonly limits = runtimeConfig.files;
  protected readonly roomId = toSignal(this.route.paramMap.pipe(map((p) => p.get('roomId'))), { initialValue: this.route.snapshot.paramMap.get('roomId') });
  protected readonly blocked = signal<string | null>(null);
  protected readonly room = computed(() => this.chat.chatOf(this.roomId() ?? ''));
  protected readonly conversation = computed(() => this.chat.conversations().find((c) => c.roomId === this.roomId()) ?? null);

  constructor() {
    effect(() => {
      const id = this.roomId();
      if (id) void this.enter(id);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    if (this.chat.conversationsState() === 'idle' || this.chat.conversationsState() === 'error') void this.chat.loadConversations();
  }

  protected open(id: string): void {
    void this.router.navigate(['/chats', id]);
  }

  protected back(): void {
    void this.router.navigate(['/chats']);
  }

  /** Comprueba que el ID sea válido y que el usuario pertenezca a la sala antes de mostrar nada. */
  private async enter(id: string): Promise<void> {
    this.blocked.set(null);
    if (!isPlausibleRoomId(id)) {
      this.blocked.set('El enlace de la conversación no es válido.');
      return;
    }
    const problem = await this.chat.checkAccess(id);
    if (problem) {
      this.blocked.set(problem);
      return;
    }
    await this.chat.open(id);
  }

  protected async send(message: ComposerMessage): Promise<void> {
    await this.chat.send(this.roomId()!, message);
  }

  protected async download(file: MessageAttachmentView): Promise<void> {
    try {
      saveBlob(await this.chat.fetchFile(file), file.name);
    } catch {
      this.announcer.announce('No pudimos descargar el archivo.', 'error');
    }
  }
}
