import { Injectable, signal } from '@angular/core';

export type MediaPermission = 'idle' | 'requesting' | 'granted' | 'denied' | 'unavailable' | 'unsupported';

/**
 * Captura LOCAL de cámara y micrófono con `getUserMedia` (real, no simulada). Esto NO transmite
 * nada a otros participantes: el envío por WebRTC depende de `PeerConnectionsService` (pendiente).
 * Las pistas se detienen con `stop()` al salir de la sala.
 */
@Injectable()
export class MediaService {
  readonly stream = signal<MediaStream | null>(null);
  readonly permission = signal<MediaPermission>('idle');
  /** Pantalla compartida (captura local con `getDisplayMedia`; no se transmite a otros todavía). */
  readonly screenStream = signal<MediaStream | null>(null);
  readonly screenMessage = signal<string | null>(null);

  /** Mensaje comprensible del último fallo (cómo habilitar el permiso, falta de dispositivo…). */
  readonly message = signal<string | null>(null);

  /** Pide permiso y arranca la captura. Devuelve `true` si hay al menos una pista activa. */
  async request(want: { audio: boolean; video: boolean }): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.permission.set('unsupported');
      this.message.set('Tu navegador no permite usar cámara ni micrófono aquí (se requiere HTTPS o un navegador compatible). Puedes seguir en la sala usando el chat.');
      return false;
    }
    this.permission.set('requesting');
    this.message.set(null);
    try {
      this.addStream(await navigator.mediaDevices.getUserMedia(want));
      return true;
    } catch (error) {
      const name = (error as DOMException)?.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        this.permission.set(this.stream() ? 'granted' : 'denied');
        this.message.set(
          'Bloqueaste el acceso a la cámara o al micrófono. Para activarlo, abre el candado junto a la dirección del sitio, permite «Cámara» y «Micrófono» y vuelve a intentarlo. Puedes seguir en la sala usando el chat.'
        );
        return false;
      }
      // Sin cámara: se intenta solo audio (y viceversa) antes de rendirse.
      if (want.audio && want.video && (name === 'NotFoundError' || name === 'OverconstrainedError')) {
        if (await this.request({ audio: true, video: false })) {
          this.message.set('No encontramos una cámara; usamos solo el micrófono.');
          return true;
        }
      }
      this.permission.set(this.stream() ? 'granted' : 'unavailable');
      this.message.set('No encontramos una cámara o un micrófono disponible. Revisa que estén conectados y no los use otra aplicación. Puedes seguir usando el chat.');
      return false;
    }
  }

  /** Activa o desactiva las pistas de un tipo; una pista deshabilitada no transmite contenido. */
  setEnabled(kind: 'audio' | 'video', enabled: boolean): void {
    const tracks = kind === 'audio' ? this.stream()?.getAudioTracks() : this.stream()?.getVideoTracks();
    tracks?.forEach((t) => (t.enabled = enabled));
  }

  hasTrack(kind: 'audio' | 'video'): boolean {
    const s = this.stream();
    return !!s && (kind === 'audio' ? s.getAudioTracks().length > 0 : s.getVideoTracks().length > 0);
  }

  /** Pide al usuario elegir una pantalla/ventana. Cancelar el selector deja todo igual. */
  async startScreen(): Promise<boolean> {
    this.screenMessage.set(null);
    if (!navigator.mediaDevices?.getDisplayMedia) {
      this.screenMessage.set('Tu navegador no permite compartir pantalla. Prueba con un navegador de escritorio actualizado.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      // Si se detiene desde el navegador ("Dejar de compartir"), se limpia el estado.
      stream.getVideoTracks()[0]?.addEventListener('ended', () => this.stopScreen());
      this.screenStream.set(stream);
      return true;
    } catch (error) {
      if ((error as DOMException)?.name !== 'NotAllowedError') {
        this.screenMessage.set('No pudimos iniciar la pantalla compartida. Inténtalo de nuevo.');
      }
      return false;
    }
  }

  stopScreen(): void {
    this.screenStream()?.getTracks().forEach((t) => t.stop());
    this.screenStream.set(null);
  }

  /** Detiene todas las pistas capturadas. */
  stop(): void {
    this.stopScreen();
    this.stream()?.getTracks().forEach((t) => t.stop());
    this.stream.set(null);
    if (this.permission() === 'granted') this.permission.set('idle');
  }

  /** Suma las pistas nuevas a la captura existente (pedir el micrófono no enciende la cámara ni al revés). */
  private addStream(next: MediaStream): void {
    const current = this.stream();
    this.stream.set(current ? new MediaStream([...current.getTracks(), ...next.getTracks()]) : next);
    this.permission.set('granted');
  }
}
