import { ChangeDetectionStrategy, Component, ElementRef, effect, input, output, viewChild } from '@angular/core';

import { IconComponent } from '../../../shared/ui/atoms/icon/icon.component';

/**
 * Escenario de "presentar pantalla": muestra TU captura local (`getDisplayMedia`). Los demás aún no
 * la reciben: falta WebRTC (`PeerConnectionsService.setScreen`), y la pantalla lo indica.
 */
@Component({
  selector: 'app-screen-share-view',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl bg-surface-raised shadow-raised" aria-labelledby="screen-title">
      <header class="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 id="screen-title" class="flex items-center gap-2 text-sm font-semibold text-ink"><app-icon name="present_to_all" [size]="18" /> Estás presentando tu pantalla</h2>
        <button type="button" class="btn-primary h-10 px-4 text-xs" (click)="stop.emit()">Dejar de presentar</button>
      </header>
      <p class="bg-warning-soft px-4 py-1.5 text-xs font-medium text-warning" role="note">Los demás participantes aún no ven tu pantalla: el envío por WebRTC está pendiente de integración.</p>
      <div class="relative min-h-0 flex-1 bg-ink">
        <video #video class="absolute inset-0 h-full w-full object-contain" autoplay muted playsinline aria-label="Vista previa de tu pantalla compartida"></video>
      </div>
    </section>
  `,
  host: { class: 'block h-full min-h-0' }
})
export class ScreenShareViewComponent {
  readonly stream = input<MediaStream | null>(null);
  readonly stop = output<void>();
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  constructor() {
    effect(() => {
      const el = this.video().nativeElement;
      if (el.srcObject !== this.stream()) el.srcObject = this.stream();
    });
  }
}
