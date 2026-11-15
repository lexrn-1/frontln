import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { DevAccess } from './dev-access';

/** Botón TEMPORAL del login para entrar al panel sin autenticarse (solo en desarrollo). */
@Component({
  selector: 'app-dev-access-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (dev.allowed) {
      <aside class="neu-well mt-6 px-4 py-3 text-xs text-muted" aria-label="Acceso de desarrollo">
        <p class="font-semibold text-ink">Acceso de desarrollo</p>
        <p class="mt-1">Entra al panel con datos de demostración, sin iniciar sesión. No existe en producción.</p>
        <button type="button" class="btn-ghost mt-3 h-10 w-full text-[13px]" (click)="dev.enter()">
          Entrar al panel (solo desarrollo)
        </button>
      </aside>
    }
  `
})
export class DevAccessButtonComponent {
  protected readonly dev = inject(DevAccess);
}
