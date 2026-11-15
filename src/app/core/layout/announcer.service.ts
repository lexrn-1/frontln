import { Injectable, signal } from '@angular/core';

/**
 * Confirmaciones breves ("Código copiado") que se muestran como aviso visible y se anuncian a los
 * lectores de pantalla sin mover el foco. Las pinta un `<app-toast>` del shell o de la sala.
 */
@Injectable({ providedIn: 'root' })
export class Announcer {
  readonly message = signal('');
  readonly tone = signal<'ok' | 'error'>('ok');
  private timer: ReturnType<typeof setTimeout> | undefined;

  announce(text: string, tone: 'ok' | 'error' = 'ok', ms = 3500): void {
    clearTimeout(this.timer);
    this.tone.set(tone);
    // Se vacía y se repone para que el lector repita el mismo texto si se anuncia dos veces.
    this.message.set('');
    setTimeout(() => this.message.set(text));
    this.timer = setTimeout(() => this.message.set(''), ms);
  }
}
