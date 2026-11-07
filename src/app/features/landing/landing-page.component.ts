import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthStore } from '../../core/auth/store/auth.store';
import { AvatarComponent } from '../../shared/ui/atoms/avatar/avatar.component';
import { BrandLogoComponent } from '../../shared/ui/atoms/brand-logo/brand-logo.component';
import { IconComponent } from '../../shared/ui/atoms/icon/icon.component';
import { SiteHeaderComponent, SiteNavLink } from '../../shared/ui/organisms/site-header/site-header.component';
import { HeroPreviewComponent } from './components/hero-preview.component';
import { ServiceStatusComponent } from './components/service-status.component';
import { provideSystemStatus } from './services/system-status.service';
import { SystemStatusStore } from './store/system-status.store';

interface Feature {
  icon: string;
  tone: string;
  title: string;
  text: string;
}

/** Página pública de inicio (ruta `/`). */
@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    AvatarComponent,
    BrandLogoComponent,
    HeroPreviewComponent,
    IconComponent,
    RouterLink,
    ServiceStatusComponent,
    SiteHeaderComponent
  ],
  providers: [provideSystemStatus(), SystemStatusStore],
  templateUrl: './landing-page.component.html'
})
export class LandingPageComponent {
  protected readonly auth = inject(AuthStore);
  protected readonly year = new Date().getFullYear();

  protected readonly links: SiteNavLink[] = [
    { label: 'Funciones', fragment: 'funciones' },
    { label: 'Cómo funciona', fragment: 'como-funciona' }
  ];

  protected readonly people = [
    { name: 'Lucía Castro', tone: 'peach' },
    { name: 'Carlos Vega', tone: 'mint' },
    { name: 'Ana Ruiz', tone: 'sky' },
    { name: '+ +', tone: 'ink' }
  ];

  protected readonly features: Feature[] = [
    {
      icon: 'videocam',
      tone: 'bg-tile-rose text-primary',
      title: 'Salas que se sienten cerca',
      text: 'Videollamadas fluidas, chat y pantalla compartida para resolver dudas al instante.'
    },
    {
      icon: 'center_focus_strong',
      tone: 'bg-lavender text-ink',
      title: 'Enfoque compartido',
      text: 'Temporizadores y objetivos visibles que mantienen al equipo en la misma dirección.'
    },
    {
      icon: 'verified_user',
      tone: 'bg-tile-mint text-success',
      title: 'Privado por diseño',
      text: 'Tú decides quién entra. Códigos de acceso y controles claros en cada sala.'
    }
  ];
}
