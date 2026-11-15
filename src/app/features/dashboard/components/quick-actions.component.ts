import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../../../shared/ui/atoms/icon/icon.component';

/** Accesos rápidos: crear sala, unirse con código y explorar salas. */
@Component({
  selector: 'app-quick-actions',
  standalone: true,
  imports: [IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="grid gap-5 md:grid-cols-3" aria-label="Acciones rápidas">
      <li>
        <button type="button" class="action-card" (click)="create.emit()">
          <span class="neu-chip h-11 w-11 bg-tile-rose text-primary"><app-icon name="add" [size]="20" /></span>
          <span class="flex-1 text-left"><span class="block text-sm font-semibold text-ink">Crear una sala</span><span class="block text-xs text-muted">Invita a tu equipo</span></span>
          <app-icon name="chevron_right" [size]="18" class="text-muted" />
        </button>
      </li>
      <li>
        <button type="button" class="action-card" (click)="join.emit()">
          <span class="neu-chip h-11 w-11 bg-lavender text-ink"><app-icon name="link" [size]="20" /></span>
          <span class="flex-1 text-left"><span class="block text-sm font-semibold text-ink">Unirse con código</span><span class="block text-xs text-muted">Introduce tu invitación</span></span>
          <app-icon name="chevron_right" [size]="18" class="text-muted" />
        </button>
      </li>
      <li>
        <a routerLink="/explorar" class="action-card">
          <span class="neu-chip h-11 w-11 bg-tile-mint text-success"><app-icon name="search" [size]="20" /></span>
          <span class="flex-1 text-left"><span class="block text-sm font-semibold text-ink">Explorar salas</span><span class="block text-xs text-muted">Encuentra tu grupo</span></span>
          <app-icon name="chevron_right" [size]="18" class="text-muted" />
        </a>
      </li>
    </ul>
  `,
  styles: `
    .action-card {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 1rem;
      border-radius: 1.25rem;
      background: var(--color-surface-raised);
      padding: 1.25rem 1.5rem;
      box-shadow: var(--shadow-soft);
      transition: box-shadow var(--duration-micro) var(--ease-out);
    }
    .action-card:active {
      box-shadow: var(--shadow-pressed);
    }
  `,
  host: { class: 'block' }
})
export class QuickActionsComponent {
  readonly create = output<void>();
  readonly join = output<void>();
}
