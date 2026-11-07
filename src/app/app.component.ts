import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, skip } from 'rxjs';

/** Raíz: enlace "saltar al contenido" y foco en `#contenido` tras cada navegación. */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <a class="skip-link" href="#contenido" (click)="skipToContent($event)">Saltar al contenido</a>
    <router-outlet />
  `
})
export class AppComponent {
  constructor() {
    inject(Router)
      .events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        skip(1),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe((e) => {
        if (!e.urlAfterRedirects.includes('#')) {
          setTimeout(() => document.getElementById('contenido')?.focus({ preventScroll: true }));
        }
      });
  }

  protected skipToContent(event: Event): void {
    event.preventDefault();
    document.getElementById('contenido')?.focus();
  }
}
