import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Raíz de la aplicación: las rutas se declaran en `app.routes.ts`. */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`
})
export class AppComponent {}
