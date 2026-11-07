import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';

import { runtimeConfig } from '../../../core/config/runtime-config';
import { IconComponent } from '../../../shared/ui/atoms/icon/icon.component';
import { SpinnerComponent } from '../../../shared/ui/atoms/spinner/spinner.component';
import { SystemStatusStore } from '../store/system-status.store';

/** Sprint 0: muestra un dato leído por la API desde Firestore, con carga, error y reintento. */
@Component({
  selector: 'app-service-status',
  standalone: true,
  imports: [IconComponent, SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-wrap items-center gap-2 text-xs text-muted" role="status" aria-live="polite">
      @switch (store.state()) {
        @case ('loading') {
          <app-spinner [size]="12" />
          <span>Comprobando el servicio…</span>
        }
        @case ('success') {
          <span class="h-2 w-2 rounded-full bg-success" aria-hidden="true"></span>
          <span>
            Servicio en línea · <strong class="font-semibold text-ink">{{ store.status()?.sample?.value }}</strong>
            {{ store.status()?.sample?.label }}
            @if (useMocks) {
              <span class="ml-1 rounded-md bg-warning-soft px-1.5 py-0.5 font-medium text-warning">datos simulados</span>
            }
          </span>
        }
        @case ('error') {
          <app-icon name="cloud_off" [size]="14" class="text-danger" />
          <span>{{ store.error() }}</span>
          <button type="button" class="link-accent" (click)="store.load()">Reintentar</button>
        }
      }
    </div>
  `
})
export class ServiceStatusComponent implements OnInit {
  protected readonly store = inject(SystemStatusStore);
  protected readonly useMocks = runtimeConfig.useMocks;

  ngOnInit(): void {
    this.store.load();
  }
}
