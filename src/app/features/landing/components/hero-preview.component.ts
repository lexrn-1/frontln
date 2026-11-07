import { ChangeDetectionStrategy, Component } from '@angular/core';

import { AvatarComponent } from '../../../shared/ui/atoms/avatar/avatar.component';
import { IconComponent } from '../../../shared/ui/atoms/icon/icon.component';

interface PreviewTile {
  initials: string;
  name: string;
  tile: string;
}

/** Ilustración de una sala en curso (decorativa, con descripción textual para lectores). */
@Component({
  selector: 'app-hero-preview',
  standalone: true,
  imports: [AvatarComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="relative mx-auto w-full max-w-[440px] pb-8 pt-6" role="img"
      aria-label="Vista previa de una sala de estudio: Bioquímica, final, con cuatro participantes y el modo enfoque activado.">
      <div class="rounded-[26px] bg-surface-raised p-4 shadow-raised" aria-hidden="true">
        <div class="mb-3 flex items-center gap-2 px-1">
          <app-icon name="menu_book" [size]="16" class="text-primary" />
          <span class="text-[13px] font-semibold text-ink">Bioquímica · Final</span>
        </div>
        <div class="grid grid-cols-2 gap-2.5">
          @for (tile of tiles; track tile.initials) {
            <div class="relative grid aspect-[4/3] place-items-center rounded-2xl shadow-inset" [class]="tile.tile">
              <span class="grid h-12 w-12 place-items-center rounded-full bg-surface-raised text-sm font-semibold text-ink shadow-soft">
                {{ tile.initials }}
              </span>
              <span class="absolute bottom-2 left-2 rounded-md bg-surface-raised px-1.5 py-0.5 text-[10px] font-medium text-ink">
                {{ tile.name }}
              </span>
            </div>
          }
        </div>
        <div class="mt-3 flex items-center justify-center gap-2">
          @for (icon of controls; track icon) {
            <span class="grid h-8 w-8 place-items-center rounded-lg bg-surface-raised text-muted shadow-soft">
              <app-icon [name]="icon" [size]="16" />
            </span>
          }
          <span class="grid h-8 w-8 place-items-center rounded-lg bg-primary text-white shadow-primary">
            <app-icon name="logout" [size]="16" />
          </span>
        </div>
      </div>

      <div class="absolute -right-2 top-0 flex items-center gap-2 rounded-2xl bg-surface-raised px-3 py-2 shadow-raised sm:-right-6" aria-hidden="true">
        <span class="neu-chip h-7 w-7 rounded-lg bg-lavender text-ink">
          <app-icon name="center_focus_strong" [size]="15" />
        </span>
        <span>
          <span class="block text-[11px] font-semibold text-ink">Modo enfoque</span>
          <span class="block text-[10px] text-muted">25 min sin interrupciones</span>
        </span>
      </div>

      <div class="absolute -left-2 bottom-0 flex items-center gap-2 rounded-2xl bg-surface-raised px-3 py-2 shadow-raised sm:-left-8" aria-hidden="true">
        <span class="neu-chip h-7 w-7 rounded-lg bg-success-soft text-success">
          <app-icon name="check" [size]="15" />
        </span>
        <span>
          <span class="block text-[11px] font-semibold text-ink">Objetivo completado</span>
          <span class="block text-[10px] text-muted">Repasar enzimas</span>
        </span>
      </div>
    </figure>
  `
})
export class HeroPreviewComponent {
  protected readonly tiles: PreviewTile[] = [
    { initials: 'LC', name: 'Lucía C.', tile: 'bg-tile-peach' },
    { initials: 'MS', name: 'Mateo S.', tile: 'bg-tile-mint' },
    { initials: 'AV', name: 'Ana V.', tile: 'bg-tile-sky' },
    { initials: 'TÚ', name: 'Marina', tile: 'bg-tile-rose' }
  ];
  protected readonly controls = ['mic', 'videocam', 'chat_bubble'];
}
