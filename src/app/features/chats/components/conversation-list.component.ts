import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { Conversation } from '../../../core/chat/models/chat.models';
import { AvatarComponent } from '../../../shared/ui/atoms/avatar/avatar.component';
import { EmptyStateComponent } from '../../../shared/ui/molecules/empty-state/empty-state.component';
import { SearchBoxComponent } from '../../../shared/ui/molecules/search-box/search-box.component';

const fold = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false });
const dateFormat = new Intl.DateTimeFormat('es', { day: '2-digit', month: '2-digit' });

/** Panel izquierdo de `/chats`: buscador y salas ordenadas por actividad, con último mensaje y no leídos. */
@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [AvatarComponent, EmptyStateComponent, SearchBoxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-full min-h-0 flex-col gap-3">
      <app-search-box [(value)]="query" label="Buscar conversaciones" placeholder="Buscar conversación…" />

      @switch (state()) {
        @case ('loading') {
          <ul class="space-y-3" role="status" aria-label="Cargando conversaciones">
            @for (n of skeletons; track n) { <li class="h-16 animate-pulse rounded-2xl bg-skeleton"></li> }
          </ul>
        }
        @case ('error') {
          <app-empty-state tone="error" icon="cloud_off" title="No pudimos cargar tus chats" [text]="error()">
            <button type="button" class="btn-ghost h-10" (click)="retry.emit()">Reintentar</button>
          </app-empty-state>
        }
        @default {
          @if (filtered().length) {
            <ul class="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1" aria-label="Conversaciones">
              @for (c of filtered(); track c.roomId) {
                <li>
                  <button
                    type="button"
                    class="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition"
                    [class]="c.roomId === selectedId() ? 'bg-surface-raised shadow-pressed' : 'hover:bg-surface-raised'"
                    [attr.aria-current]="c.roomId === selectedId() ? 'true' : null"
                    (click)="select.emit(c.roomId)"
                  >
                    <app-avatar [name]="c.name" [tone]="c.tone" [size]="44" />
                    <span class="min-w-0 flex-1 leading-tight">
                      <span class="flex items-baseline justify-between gap-2">
                        <span class="truncate text-sm font-semibold text-ink">{{ c.name }}</span>
                        <span class="shrink-0 text-[11px]" [class]="c.unreadCount ? 'font-semibold text-primary' : 'text-muted'">{{ when(c) }}</span>
                      </span>
                      <span class="mt-1 flex items-center justify-between gap-2">
                        <span class="truncate text-xs text-muted">{{ preview(c) }}</span>
                        @if (c.unreadCount) {
                          <span class="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-white">
                            {{ c.unreadCount }}<span class="sr-only"> mensajes sin leer</span>
                          </span>
                        }
                      </span>
                    </span>
                  </button>
                </li>
              }
            </ul>
          } @else {
            <app-empty-state
              icon="forum"
              [title]="query() ? 'Sin resultados' : 'Aún no tienes conversaciones'"
              [text]="query() ? 'No encontramos conversaciones con esa búsqueda.' : 'Cuando crees una sala o te unas a una, su chat aparecerá aquí.'"
            />
          }
        }
      }
    </div>
  `,
  host: { class: 'block h-full min-h-0' }
})
export class ConversationListComponent {
  readonly conversations = input<Conversation[]>([]);
  readonly state = input<'idle' | 'loading' | 'ready' | 'error'>('ready');
  readonly error = input<string | null>(null);
  readonly selectedId = input<string | null>(null);
  readonly select = output<string>();
  readonly retry = output<void>();

  protected readonly query = signal('');
  protected readonly skeletons = [1, 2, 3, 4];
  protected readonly filtered = computed(() => {
    const q = fold(this.query().trim());
    if (!q) return this.conversations();
    return this.conversations().filter((c) => fold(`${c.name} ${c.subject} ${c.lastMessage?.text ?? ''}`).includes(q));
  });

  protected preview(c: Conversation): string {
    const last = c.lastMessage;
    if (!last) return 'Sin mensajes todavía';
    const text = last.text || (last.hasAttachments ? 'Archivo adjunto' : '');
    return `${last.authorName}: ${text}`;
  }

  protected when(c: Conversation): string {
    const iso = c.lastMessage?.sentAt ?? c.lastActivityAt;
    if (!iso) return '';
    const d = new Date(iso);
    const days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86_400_000);
    return days === 0 ? timeFormat.format(d) : days === 1 ? 'Ayer' : dateFormat.format(d);
  }
}
