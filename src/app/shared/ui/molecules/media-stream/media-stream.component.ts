import { ChangeDetectionStrategy, Component, ElementRef, effect, input, signal, viewChild } from '@angular/core';
/** Reproducción de un stream, con recuperación explícita del bloqueo de autoplay. */
@Component({
  selector: 'app-media-stream',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<video
      #video
      class="h-full w-full object-cover"
      [class.opacity-0]="!visible()"
      [muted]="muted()"
      autoplay
      playsinline
    ></video>
    @if (blocked()) {
      <button type="button" class="absolute left-2 top-2 rounded-lg bg-surface-raised p-2 text-xs" (click)="play()">
        Activar audio
      </button>
    }`,
  host: { class: 'absolute inset-0 block' },
})
export class MediaStreamComponent {
  readonly stream = input<MediaStream | null>(null);
  readonly muted = input(false);
  readonly visible = input(true);
  readonly blocked = signal(false);
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');
  constructor() {
    effect(
      (onCleanup) => {
        const video = this.video()?.nativeElement;
        const stream = this.stream();
        if (!video) return;
        video.srcObject = stream;
        video.muted = this.muted();
        if (stream)
          void video
            .play()
            .then(() => this.blocked.set(false))
            .catch(() => this.blocked.set(true));
        onCleanup(() => {
          video.pause();
          video.srcObject = null;
        });
      },
      { allowSignalWrites: true }
    );
  }
  play(): void {
    void this.video()
      ?.nativeElement.play()
      .then(() => this.blocked.set(false))
      .catch(() => this.blocked.set(true));
  }
}
