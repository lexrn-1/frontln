import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AvatarComponent } from '../../atoms/avatar/avatar.component';
import { BrandLogoComponent } from '../../atoms/brand-logo/brand-logo.component';
import { IconComponent } from '../../atoms/icon/icon.component';

export interface AuthTestimonial {
  quote: string;
  author: string;
  detail: string;
}

/**
 * Plantilla de autenticación: formulario a la izquierda y panel lavanda con testimonio
 * a la derecha (se oculta en pantallas pequeñas). El contenido se proyecta.
 */
@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [AvatarComponent, BrandLogoComponent, IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid min-h-screen gap-4 bg-canvas p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div class="flex flex-col px-3 py-4 sm:px-8">
        <a routerLink="/" aria-label="StudyRoom, volver al inicio" class="self-start rounded-xl">
          <app-brand-logo />
        </a>
        <main id="contenido" tabindex="-1" class="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10 outline-none">
          <p class="eyebrow">{{ eyebrow() }}</p>
          <h1 class="mt-2 text-[28px] font-semibold leading-tight text-ink">{{ heading() }}</h1>
          @if (subheading()) {
            <p class="mt-1.5 text-sm text-muted">{{ subheading() }}</p>
          }
          <div class="mt-7">
            <ng-content />
          </div>
        </main>
      </div>

      <aside
        class="relative hidden overflow-hidden rounded-[28px] bg-lavender lg:sticky lg:top-3 lg:grid lg:h-[calc(100vh-1.5rem)] lg:place-items-center"
        aria-label="Testimonio"
      >
        <span class="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lavender shadow-lavender" aria-hidden="true"></span>
        <span class="absolute right-10 top-8 h-20 w-20 rounded-full bg-lavender shadow-lavender" aria-hidden="true"></span>
        <span class="absolute bottom-14 left-10 h-12 w-12 rounded-full bg-lavender shadow-lavender" aria-hidden="true"></span>

        <figure class="relative mx-8 max-w-sm rounded-3xl bg-surface-raised p-7 shadow-lavender">
          <span class="neu-chip h-10 w-10 bg-primary-soft text-primary">
            <app-icon name="headphones" [size]="20" />
          </span>
          <blockquote class="mt-5 font-display text-xl font-semibold leading-snug text-ink">
            “{{ testimonial().quote }}”
          </blockquote>
          <figcaption class="mt-5 flex items-center gap-3">
            <app-avatar [name]="testimonial().author" tone="mint" [size]="34" />
            <span>
              <span class="block text-[13px] font-semibold text-ink">{{ testimonial().author }}</span>
              <span class="block text-xs text-muted">{{ testimonial().detail }}</span>
            </span>
          </figcaption>
        </figure>
      </aside>
    </div>
  `
})
export class AuthPageComponent {
  readonly eyebrow = input('');
  readonly heading = input.required<string>();
  readonly subheading = input<string | null>(null);
  readonly testimonial = input<AuthTestimonial>({
    quote: 'Estudiar con otras personas me ayudó a mantener la constancia que nunca conseguía sola.',
    author: 'Lucía Valdés',
    detail: 'Medicina · 4º curso'
  });
}
