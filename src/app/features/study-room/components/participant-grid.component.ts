import { MediaStreamComponent } from '../../../shared/ui/molecules/media-stream/media-stream.component';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, viewChild } from '@angular/core';

import { IconComponent } from '../../../shared/ui/atoms/icon/icon.component';
import { Participant, ParticipantTone, RoomLayout } from '../models/study-room.models';

const TILE_TONES: Record<ParticipantTone, string> = {
  peach: 'bg-tile-peach',
  mint: 'bg-tile-mint',
  sky: 'bg-tile-sky',
  rose: 'bg-tile-rose',
  lavender: 'bg-lavender',
};

@Component({
  selector: 'app-participant-grid',
  standalone: true,
  imports: [IconComponent, MediaStreamComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul
      class="grid gap-3 sm:gap-4"
      [class]="
        compact()
          ? fill()
            ? 'h-full grid-cols-1 auto-rows-fr !gap-2'
            : 'grid-cols-2 auto-rows-[104px] !gap-2 max-lg:grid-flow-col max-lg:grid-cols-none max-lg:auto-cols-[112px] max-lg:auto-rows-[88px] max-lg:overflow-x-auto max-lg:pb-1'
          : 'h-full ' + (layout() === 'grid' ? 'auto-rows-fr grid-cols-2' : 'grid-cols-3 grid-rows-[3fr_1fr]')
      "
      aria-label="Participantes de la sala"
    >
      @for (p of visible(); track p.id; let first = $first) {
        <li
          class="relative grid place-items-center overflow-hidden shadow-raised ring-1 ring-surface-raised"
          [class.min-h-[120px]]="!compact()"
          [class.rounded-3xl]="!compact()"
          [class.rounded-2xl]="compact()"
          [class]="tone(p) + (layout() === 'spotlight' && first ? ' col-span-3' : '')"
          [attr.data-connection-id]="p.id"
          [attr.aria-label]="
            p.fullName +
            (p.isSelf ? ' (tú)' : '') +
            ', micrófono ' +
            (p.micOn ? 'activado' : 'apagado') +
            ', cámara ' +
            (p.camOn ? 'encendida' : 'apagada')
          "
        >
          @if (p.isSelf ? localStream() : remoteStreams().get(p.id)) {
            <app-media-stream
              [stream]="p.isSelf ? localStream() : (remoteStreams().get(p.id) ?? null)"
              [muted]="p.isSelf"
              [visible]="p.camOn || !!p.screenSharing"
            />
          }
          @if ((!p.camOn && !p.screenSharing) || !(p.isSelf ? localStream() : remoteStreams().get(p.id))) {
            <span
              class="grid place-items-center rounded-full bg-surface-raised font-medium text-muted shadow-raised"
              [class]="
                compact()
                  ? 'h-9 w-9 text-xs max-lg:-mt-4 lg:h-11 lg:w-11 lg:text-sm'
                  : layout() === 'spotlight' && !first
                    ? 'h-14 w-14 text-base'
                    : 'h-14 w-14 text-lg sm:h-24 sm:w-24 sm:text-2xl'
              "
              aria-hidden="true"
              >{{ p.initials }}</span
            >
          }
          <span
            class="absolute rounded-lg bg-surface-raised font-semibold text-ink shadow-soft"
            [class]="
              compact()
                ? 'bottom-1.5 left-1.5 px-1.5 py-0.5 text-[10px]'
                : 'bottom-2 left-2 px-2 py-1 text-[10px] sm:bottom-4 sm:left-4 sm:px-3 sm:py-1.5 sm:text-[11px]'
            "
            >{{ p.label }}</span
          >
          <span class="absolute right-3 top-3 flex gap-1.5" aria-hidden="true">
            @if (!p.camOn && !compact()) {
              <span
                class="inline-flex items-center gap-1 rounded-md bg-surface-raised px-2 py-0.5 text-[10px] font-semibold text-muted"
                ><app-icon name="videocam_off" [size]="12" /> <span class="max-sm:sr-only">Cámara apagada</span></span
              >
            }
          </span>
          <span
            class="neu-chip absolute bg-surface-raised"
            [class]="
              (compact()
                ? 'bottom-1.5 right-1.5 h-6 w-6 '
                : 'bottom-2 right-2 h-7 w-7 sm:bottom-3.5 sm:right-4 sm:h-9 sm:w-9 ') +
              (p.micOn ? 'text-success' : 'text-danger')
            "
            aria-hidden="true"
          >
            <app-icon [name]="p.micOn ? 'mic' : 'mic_off'" [size]="compact() ? 13 : 18" />
          </span>
        </li>
      }
      @if (extra() > 0) {
        <li
          class="relative grid place-items-center overflow-hidden bg-lavender shadow-raised ring-1 ring-surface-raised"
          [class]="compact() ? 'rounded-2xl' : 'min-h-[120px] rounded-3xl'"
          [attr.aria-label]="extra() + ' participantes más'"
        >
          <span
            class="grid place-items-center rounded-full bg-surface-raised font-semibold text-ink shadow-raised"
            [class]="compact() ? 'h-12 w-12 text-base' : 'h-20 w-20 text-2xl sm:h-24 sm:w-24'"
            aria-hidden="true"
            >+{{ extra() }}</span
          >
        </li>
      }
    </ul>
  `,
  host: { class: 'block', '[class.h-full]': '!compact() || fill()' },
})
export class ParticipantGridComponent {
  readonly participants = input<Participant[]>([]);
  readonly layout = input<RoomLayout>('grid');
  /** Tira pequeña que acompaña al tablero o a la pantalla compartida. */
  readonly compact = input(false);
  /** En la tira compacta: ocupa todo el alto disponible (cuando no hay chat debajo). */
  readonly fill = input(false);
  /** Máximo de tarjetas; si hay más, la última muestra "+N" como en Meet. */
  readonly maxVisible = input(6);
  readonly remoteStreams = input<ReadonlyMap<string, MediaStream>>(new Map());
  readonly localStream = input<MediaStream | null>(null);
  private readonly overflow = computed(() => this.participants().length > this.maxVisible());
  protected readonly visible = computed(() =>
    this.overflow() ? this.participants().slice(0, this.maxVisible() - 1) : this.participants()
  );
  protected readonly extra = computed(() =>
    this.overflow() ? this.participants().length - (this.maxVisible() - 1) : 0
  );
  protected tone(p: Participant): string {
    return TILE_TONES[p.tone];
  }
}
