import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BrandLogoComponent } from '../../shared/ui/atoms/brand-logo/brand-logo.component';
import { IconComponent } from '../../shared/ui/atoms/icon/icon.component';

/** Página 404 para cualquier ruta inexistente. */
@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [BrandLogoComponent, IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="px-4 py-5 sm:px-8"><a routerLink="/" aria-label="StudyRoom, ir al inicio" class="inline-block rounded-xl"><app-brand-logo /></a></header>
    <main id="contenido" tabindex="-1" class="mx-auto grid max-w-md place-items-center px-4 py-16 text-center outline-none">
      <span class="neu-chip h-16 w-16 bg-primary-soft text-primary"><app-icon name="explore_off" [size]="30" /></span>
      <p class="eyebrow mt-6">Error 404</p>
      <h1 class="mt-2 text-3xl font-medium text-ink">No encontramos esta página</h1>
      <p class="mt-3 text-sm text-muted">El enlace puede estar mal escrito o la página ya no existe.</p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <a routerLink="/dashboard" class="btn-primary">Ir a mi panel</a>
        <a routerLink="/" class="btn-ghost">Volver al inicio</a>
      </div>
    </main>
  `
})
export class NotFoundPageComponent {}
