import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BrandLogoComponent } from '../../atoms/brand-logo/brand-logo.component';

export interface SiteNavLink {
  label: string;
  /** Ancla dentro de la página (`#funciones`). */
  fragment: string;
}

/** Cabecera pública: logo, enlaces de sección y acciones proyectadas (`[headerActions]`). */
@Component({
  selector: 'app-site-header',
  standalone: true,
  imports: [BrandLogoComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
      <a routerLink="/" aria-label="StudyRoom, inicio" class="rounded-xl">
        <app-brand-logo />
      </a>
      <nav aria-label="Principal" class="flex items-center gap-1 sm:gap-2">
        <ul class="hidden items-center gap-1 md:flex">
          @for (link of links(); track link.fragment) {
            <li>
              <a
                routerLink="/"
                [fragment]="link.fragment"
                class="rounded-lg px-3 py-2 text-[13px] font-medium text-muted transition hover:text-ink"
                >{{ link.label }}</a
              >
            </li>
          }
        </ul>
        <ng-content select="[headerActions]" />
      </nav>
    </header>
  `
})
export class SiteHeaderComponent {
  readonly links = input<SiteNavLink[]>([]);
}
