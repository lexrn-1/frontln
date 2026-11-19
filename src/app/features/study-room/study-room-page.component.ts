import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { ChatStore } from '../../core/chat/store/chat.store';
import { runtimeConfig } from '../../core/config/runtime-config';
import { Announcer } from '../../core/layout/announcer.service';
import { isPlausibleRoomId } from '../../core/rooms/room-code';
import { scheduleLabel } from '../../core/utils/schedule-label';
import { IconComponent } from '../../shared/ui/atoms/icon/icon.component';
import { EmptyStateComponent } from '../../shared/ui/molecules/empty-state/empty-state.component';
import { ToastComponent } from '../../shared/ui/molecules/toast/toast.component';
import { ComposerMessage } from '../../shared/ui/organisms/message-composer/message-composer.component';
import { MessageAttachmentView } from '../../shared/ui/organisms/message-list/message-list.component';
import { copyText } from '../../shared/utils/clipboard';
import { saveBlob } from '../../shared/utils/download';
import { BoardDialogComponent } from './components/board/board-dialog.component';
import { ChatPanelComponent } from './components/chat-panel.component';
import { ControlsBarComponent } from './components/controls-bar.component';
import { GoalBannerComponent } from './components/goal-banner.component';
import { MediaPermissionAlertComponent } from './components/media-permission-alert.component';
import { ScreenShareViewComponent } from './components/screen-share-view.component';
import { ParticipantGridComponent } from './components/participant-grid.component';
import { RoomHeaderComponent } from './components/room-header.component';
import { StudyRoomStore } from './store/study-room.store';

@Component({
  selector: 'app-study-room-page',
  standalone: true,
  imports: [
    BoardDialogComponent,
    ChatPanelComponent,
    ControlsBarComponent,
    EmptyStateComponent,
    GoalBannerComponent,
    IconComponent,
    MediaPermissionAlertComponent,
    ParticipantGridComponent,
    RoomHeaderComponent,
    ScreenShareViewComponent,
    ToastComponent,
  ],
  providers: [StudyRoomStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main
      id="contenido"
      tabindex="-1"
      class="flex h-dvh flex-col gap-3 overflow-hidden p-3 outline-none sm:gap-4 sm:p-4"
    >
      @switch (store.state()) {
        @case ('loading') {
          <div class="grid flex-1 place-items-center" role="status">
            <div class="h-24 w-24 animate-pulse rounded-3xl bg-skeleton"></div>
            <span class="sr-only">Cargando la sala…</span>
          </div>
        }
        @case ('error') {
          <div class="grid flex-1 place-items-center">
            <div class="surface-card w-full max-w-md">
              <h1 class="sr-only">Sala de estudio</h1>
              <app-empty-state tone="error" icon="meeting_room" title="No pudimos abrir la sala" [text]="store.error()">
                @if (validId()) {
                  <button type="button" class="btn-ghost h-10" (click)="reload()">Reintentar</button>
                }
                <button type="button" class="btn-primary h-10" (click)="leave()">Volver al panel</button>
              </app-empty-state>
            </div>
          </div>
        }
        @default {
          @if (store.room(); as room) {
            <app-room-header
              [name]="titleParts().title"
              [subject]="titleParts().eyebrow"
              [code]="room.id"
              [live]="!!store.elapsed()"
              [statusLabel]="statusLabel()"
              (back)="leave()"
              (leave)="leave()"
              (copyCode)="copyCode()"
            />
            @if (store.session()?.goal) {
              <app-goal-banner
                [class]="store.stage() === 'grid' ? '' : 'max-lg:hidden'"
                [goal]="store.session()?.goal ?? null"
              />
            }

            @if (store.stage() === 'grid') {
              @if (store.realtimeStatus() !== 'connected') {
                <p role="status" class="rounded-xl bg-warning-soft px-3 py-2 text-xs">
                  Reconectando a la sala… El historial se recuperará al conectar.
                </p>
              }
              @if (store.mediaConnected() === 'unavailable') {
                <p role="status" class="rounded-xl bg-warning-soft px-3 py-2 text-xs">
                  No se pudo establecer audio/vídeo con algún participante. Puedes continuar usando el chat y reingresar
                  para reintentar.
                </p>
              }
              <app-media-permission-alert
                [permission]="store.permission()"
                [message]="store.permissionMessage()"
                (activate)="store.activateMedia()"
              />
            }

            <div class="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
              @if (store.stage() !== 'grid') {
                <!-- Móvil: personas en una tira horizontal sobre el escenario -->
                <app-participant-grid
                  class="shrink-0 lg:hidden"
                  [compact]="true"
                  [maxVisible]="6"
                  [participants]="store.participants()"
                  [localStream]="store.screenStream() ?? store.localStream()"
                  [remoteStreams]="store.remoteStreams()"
                />
              }
              @switch (store.stage()) {
                @case ('board') {
                  <div class="min-h-0 min-w-0 flex-1">
                    <app-board-dialog [roomId]="room.id" (closed)="store.toggleBoard()" />
                  </div>
                }
                @case ('screen') {
                  <div class="min-h-0 min-w-0 flex-1">
                    <app-screen-share-view [stream]="store.screenStream()" (stop)="store.stopScreen()" />
                  </div>
                }
                @default {
                  <div class="min-h-0 min-w-0 flex-1 overflow-y-auto lg:overflow-visible">
                    <app-participant-grid
                      [participants]="store.participants()"
                      [localStream]="store.screenStream() ?? store.localStream()"
                      [remoteStreams]="store.remoteStreams()"
                    />
                  </div>
                }
              }
              @if (store.stage() !== 'grid' || store.chatOpen()) {
                @if (store.chatOpen()) {
                  <div
                    class="fixed inset-0 z-30 bg-ink/30 backdrop-blur-sm lg:hidden"
                    aria-hidden="true"
                    (click)="store.toggleChat()"
                  ></div>
                }
                <aside
                  class="min-h-0 flex-col gap-3 lg:w-[380px] lg:shrink-0"
                  [class]="
                    store.chatOpen()
                      ? 'max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-24 max-lg:z-40 max-lg:flex max-lg:rounded-t-3xl max-lg:bg-canvas max-lg:p-2 max-lg:shadow-modal lg:flex'
                      : 'hidden lg:flex'
                  "
                  aria-label="Participantes y chat"
                >
                  @if (store.stage() !== 'grid') {
                    <app-participant-grid
                      class="hidden lg:block"
                      [class]="store.chatOpen() ? 'shrink-0' : 'min-h-0 flex-1'"
                      [compact]="true"
                      [fill]="!store.chatOpen()"
                      [maxVisible]="4"
                      [participants]="store.participants()"
                      [localStream]="store.screenStream() ?? store.localStream()"
                      [remoteStreams]="store.remoteStreams()"
                    />
                  }
                  @if (store.chatOpen()) {
                    <div class="min-h-0 flex-1">
                      <app-chat-panel
                        [messages]="chat().messages"
                        [state]="chat().state"
                        [error]="chat().error"
                        [hasMore]="!!chat().nextCursor"
                        [loadingOlder]="chat().loadingOlder"
                        [participantCount]="store.participants().length"
                        [sending]="chat().sending"
                        [sendError]="chat().sendError"
                        [limits]="limits"
                        (send)="send($event)"
                        (loadOlder)="chatStore.loadOlder(room.id)"
                        (retry)="chatStore.open(room.id)"
                        (download)="download($event)"
                        (closed)="store.toggleChat()"
                      />
                    </div>
                  }
                </aside>
              }
            </div>

            <app-controls-bar
              [participantCount]="store.participants().length"
              [micOn]="store.micOn()"
              [cameraOn]="store.cameraOn()"
              [sharing]="store.stage() === 'screen'"
              [boardOpen]="store.stage() === 'board'"
              [chatOpen]="store.chatOpen()"
              (toggleMic)="store.toggleMic()"
              (toggleCamera)="store.toggleCamera()"
              (toggleScreen)="store.toggleScreen()"
              (toggleBoard)="store.toggleBoard()"
              (toggleChat)="store.toggleChat()"
              (leave)="leave()"
              (copyCode)="copyCode()"
              (openChats)="openChats()"
            />
          }
        }
      }
    </main>
    <app-toast [message]="announcer.message()" [tone]="announcer.tone()" />
  `,
})
export class StudyRoomPageComponent implements OnInit, OnDestroy {
  protected readonly store = inject(StudyRoomStore);
  protected readonly chatStore = inject(ChatStore);
  protected readonly announcer = inject(Announcer);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly limits = runtimeConfig.files;
  private readonly roomId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly validId = signal(isPlausibleRoomId(this.roomId));
  protected readonly chat = computed(() => this.chatStore.chatOf(this.roomId));

  /** "Cálculo II · Integrales" → sobretítulo "Cálculo II" y título "Integrales". */
  protected readonly titleParts = computed(() => {
    const room = this.store.room();
    const [first, ...rest] = (room?.name ?? '').split(' · ');
    return rest.length
      ? { eyebrow: first, title: rest.join(' · ') }
      : { eyebrow: room?.subject ?? '', title: room?.name ?? '' };
  });

  protected readonly statusLabel = computed(() => {
    const room = this.store.room();
    const elapsed = this.store.elapsed();
    if (elapsed) return `En curso · ${elapsed}`;
    if (room?.startsAt) return scheduleLabel(room.startsAt);
    return 'Sala de estudio';
  });

  ngOnInit(): void {
    this.reload();
  }

  ngOnDestroy(): void {
    this.chatStore.close(this.roomId);
  }

  protected async reload(): Promise<void> {
    if (!this.validId()) {
      this.store.error.set('El enlace de la sala no es válido.');
      this.store.state.set('error');
      return;
    }
    await this.store.load(this.roomId);
    if (this.store.state() === 'ready') void this.chatStore.open(this.roomId);
  }

  protected async send(message: ComposerMessage): Promise<void> {
    await this.chatStore.send(this.roomId, message);
  }

  protected async download(file: MessageAttachmentView): Promise<void> {
    try {
      saveBlob(await this.chatStore.fetchFile(file), file.name);
    } catch {
      this.announcer.announce('No pudimos descargar el archivo.', 'error');
    }
  }

  protected leave(): void {
    this.store.release();
    void this.router.navigate(['/dashboard']);
  }

  protected openChats(): void {
    void this.router.navigate(['/chats', this.roomId]);
  }

  protected async copyCode(): Promise<void> {
    const code = this.store.room()?.id;
    if (!code) return;
    if (await copyText(code)) this.announcer.announce(`Código ${code} copiado`);
    else this.announcer.announce('No pudimos copiar el código. Cópialo manualmente.', 'error');
  }
}
