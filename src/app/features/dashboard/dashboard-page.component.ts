import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Announcer } from '../../core/layout/announcer.service';
import { RoomDialogs } from '../../core/layout/room-dialogs.service';
import { IconComponent } from '../../shared/ui/atoms/icon/icon.component';
import { EmptyStateComponent } from '../../shared/ui/molecules/empty-state/empty-state.component';
import { RoomCardComponent } from '../../shared/ui/organisms/room-card/room-card.component';
import { copyText } from '../../shared/utils/clipboard';
import { AgendaComponent } from './components/agenda.component';
import { NextSessionCardComponent } from './components/next-session-card.component';
import { QuickActionsComponent } from './components/quick-actions.component';
import { WeeklyActivityComponent } from './components/weekly-activity.component';
import { DashboardStore } from './store/dashboard.store';

/**
 * Panel del estudiante (ruta `/dashboard`, dentro del shell). Solo presenta y delega: los datos
 * salen de `DashboardStore` y los modales los gestiona el shell mediante `RoomDialogs`.
 */
@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    AgendaComponent,
    EmptyStateComponent,
    IconComponent,
    NextSessionCardComponent,
    QuickActionsComponent,
    RoomCardComponent,
    RouterLink,
    WeeklyActivityComponent
  ],
  providers: [DashboardStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-page.component.html'
})
export class DashboardPageComponent {
  protected readonly store = inject(DashboardStore);
  protected readonly dialogs = inject(RoomDialogs);
  private readonly router = inject(Router);
  private readonly announcer = inject(Announcer);

  protected readonly skeletons = [1, 2, 3];

  protected openRoom(id: string): void {
    void this.router.navigate(['/salas', id]);
  }

  protected removeRoom(id: string): void {
    const view = this.store.roomViews().find((r) => r.id === id);
    if (view) this.dialogs.openRemove({ id, name: view.name });
  }

  protected editRoom(id: string): void {
    const room = this.store.roomViews().find((r) => r.id === id);
    if (room) this.dialogs.openEdit({ id, name: room.name });
  }

  protected async copyCode(id: string): Promise<void> {
    if (await copyText(id)) this.announcer.announce(`Código ${id} copiado`);
    else this.announcer.announce('No pudimos copiar el código. Cópialo manualmente.', 'error');
  }
}
