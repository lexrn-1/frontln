import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, signal, untracked, viewChild } from '@angular/core';

import { formatBytes } from '../../../utils/file-validation';
import { IconComponent } from '../../atoms/icon/icon.component';
import { SpinnerComponent } from '../../atoms/spinner/spinner.component';
import { EmptyStateComponent } from '../../molecules/empty-state/empty-state.component';

export interface MessageAttachmentView {
  id: string;
  name: string;
  size: number;
  mimeType: string;
}

/** Mensaje listo para pintar (estructuralmente igual a `ChatMessage` del dominio). */
export interface MessageView {
  id: string;
  authorName: string;
  authorInitial: string;
  tone: 'peach' | 'mint' | 'sky' | 'rose' | 'lavender';
  text: string;
  attachments: MessageAttachmentView[];
  sentAt: string;
  own: boolean;
}

const TONE_BG: Record<MessageView['tone'], string> = {
  peach: 'bg-tile-peach', mint: 'bg-tile-mint', sky: 'bg-tile-sky', rose: 'bg-tile-rose', lavender: 'bg-lavender'
};
const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false });
const dayFormat = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' });

interface Group { day: string; items: MessageView[] }

/**
 * Historial de mensajes compartido por el chat de la sala y `/chats`. Presentacional: muestra
 * estados de carga, error y vacío, agrupa por día, ofrece "Cargar mensajes anteriores" conservando
 * la posición, hace auto-scroll solo si el usuario está al final y, si no, muestra "Mensajes nuevos".
 */
@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [EmptyStateComponent, IconComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative h-full min-h-0">
      @switch (state()) {
        @case ('loading') {
          <div class="space-y-4 p-1" role="status" aria-label="Cargando mensajes">
            @for (n of skeletons; track n) {
              <div class="flex gap-3" [class.flex-row-reverse]="n % 2 === 0">
                <span class="h-8 w-8 shrink-0 animate-pulse rounded-full bg-skeleton"></span>
                <span class="h-12 w-3/5 animate-pulse rounded-2xl bg-skeleton"></span>
              </div>
            }
          </div>
        }
        @case ('error') {
          <app-empty-state tone="error" icon="cloud_off" title="No pudimos cargar los mensajes" [text]="error()">
            <button type="button" class="btn-ghost h-10" (click)="retry.emit()">Reintentar</button>
          </app-empty-state>
        }
        @default {
          <div #scroller class="h-full overflow-y-auto pr-1" (scroll)="onScroll()">
            @if (hasMore()) {
              <div class="flex justify-center pb-3">
                <button type="button" class="btn-ghost h-9 px-4 text-xs" [disabled]="loadingOlder()" (click)="requestOlder()">
                  @if (loadingOlder()) { <app-spinner [size]="12" /> Cargando… } @else { Cargar mensajes anteriores }
                </button>
              </div>
            }
            <div role="log" aria-live="polite" aria-relevant="additions" [attr.aria-label]="label()">
              @for (group of groups(); track group.day) {
                <h3 class="my-3 flex items-center gap-3 text-center text-[11px] font-normal text-muted before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">{{ group.day }}</h3>
                <ol class="space-y-4">
                  @for (m of group.items; track m.id) {
                    <li class="flex gap-2.5" [class.flex-row-reverse]="m.own">
                      <span class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-ink" [class]="tone(m)" aria-hidden="true">{{ m.authorInitial }}</span>
                      <div class="min-w-0 max-w-[85%]" [class.text-right]="m.own">
                        <p class="text-[11px] text-muted"><span class="font-semibold text-ink">{{ m.own ? 'Tú' : m.authorName }}</span> · <time [attr.datetime]="m.sentAt">{{ time(m) }}</time></p>
                        @if (m.text) {
                          <p class="mt-1.5 inline-block whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-left text-[13px] leading-snug text-ink" [class]="m.own ? 'bg-primary-soft' : 'bg-skeleton'">{{ m.text }}</p>
                        }
                        @for (file of m.attachments; track file.id) {
                          <button type="button" class="mt-1.5 flex w-full max-w-xs items-center gap-2.5 rounded-xl bg-surface-raised px-3 py-2 text-left shadow-soft transition active:shadow-pressed" (click)="download.emit(file)" [attr.aria-label]="'Descargar ' + file.name + ', ' + size(file.size)">
                            <span class="neu-chip h-9 w-9 shrink-0 bg-lavender text-ink"><app-icon [name]="icon(file)" [size]="18" /></span>
                            <span class="min-w-0 flex-1 leading-tight">
                              <span class="block truncate text-xs font-semibold text-ink">{{ file.name }}</span>
                              <span class="block text-[11px] text-muted">{{ size(file.size) }}</span>
                            </span>
                            <app-icon name="download" [size]="18" class="text-muted" />
                          </button>
                        }
                      </div>
                    </li>
                  }
                </ol>
              }
            </div>
            @if (!messages().length) {
              <p class="mt-8 px-4 text-center text-xs text-muted">{{ emptyText() }}</p>
            }
          </div>
          @if (hasNew()) {
            <button type="button" class="btn-primary absolute bottom-2 left-1/2 h-8 -translate-x-1/2 px-3 text-[11px]" (click)="scrollToEnd()">Mensajes nuevos</button>
          }
        }
      }
    </div>
  `,
  host: { class: 'block h-full min-h-0' }
})
export class MessageListComponent {
  readonly messages = input<MessageView[]>([]);
  readonly state = input<'idle' | 'loading' | 'ready' | 'error'>('ready');
  readonly error = input<string | null>(null);
  readonly hasMore = input(false);
  readonly loadingOlder = input(false);
  readonly label = input('Mensajes del chat');
  readonly emptyText = input('Aún no hay mensajes. Escribe el primero.');
  readonly loadOlder = output<void>();
  readonly retry = output<void>();
  readonly download = output<MessageAttachmentView>();

  protected readonly skeletons = [1, 2, 3, 4];
  protected readonly hasNew = signal(false);
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private atBottom = true;
  private anchor: { height: number; top: number } | null = null;
  private lastFirst: string | null = null;
  private lastLast: string | null = null;

  protected readonly groups = (): Group[] => {
    const groups: Group[] = [];
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86_400_000).toDateString();
    for (const m of this.messages()) {
      const d = new Date(m.sentAt);
      const key = d.toDateString();
      const day = key === today ? 'Hoy' : key === yesterday ? 'Ayer' : dayFormat.format(d);
      const last = groups.at(-1);
      if (last?.day === day) last.items.push(m);
      else groups.push({ day, items: [m] });
    }
    return groups;
  };

  constructor() {
    effect(() => {
      const list = this.messages();
      const first = list[0]?.id ?? null;
      const last = list.at(-1) ?? null;
      untracked(() => {
        setTimeout(() => {
          const el = this.scroller()?.nativeElement;
          if (!el) return;
          const prependedOlder = this.anchor && first !== this.lastFirst && last?.id === this.lastLast;
          if (prependedOlder && this.anchor) {
            // Mensajes anteriores: se conserva lo que el usuario estaba leyendo.
            el.scrollTop = this.anchor.top + (el.scrollHeight - this.anchor.height);
          } else if (this.lastLast === null || this.atBottom || last?.own) {
            this.scrollToEnd();
          } else if (last && last.id !== this.lastLast) {
            this.hasNew.set(true);
          }
          this.anchor = null;
          this.lastFirst = first;
          this.lastLast = last?.id ?? null;
        });
      });
    });
  }

  protected requestOlder(): void {
    const el = this.scroller()?.nativeElement;
    if (el) this.anchor = { height: el.scrollHeight, top: el.scrollTop };
    this.loadOlder.emit();
  }

  protected onScroll(): void {
    const el = this.scroller()?.nativeElement;
    if (!el) return;
    this.atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    if (this.atBottom) this.hasNew.set(false);
  }

  protected scrollToEnd(): void {
    const el = this.scroller()?.nativeElement;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    this.atBottom = true;
    this.hasNew.set(false);
  }

  protected tone(m: MessageView): string {
    return TONE_BG[m.tone];
  }
  protected time(m: MessageView): string {
    return timeFormat.format(new Date(m.sentAt));
  }
  protected size(bytes: number): string {
    return formatBytes(bytes);
  }
  protected icon(file: MessageAttachmentView): string {
    if (file.mimeType.startsWith('image/')) return 'image';
    if (file.mimeType === 'application/pdf') return 'picture_as_pdf';
    if (/sheet|excel|csv/.test(file.mimeType)) return 'table_chart';
    if (/presentation|powerpoint/.test(file.mimeType)) return 'slideshow';
    return 'description';
  }
}
