import { ChangeDetectionStrategy, Component, ElementRef, effect, input, signal, viewChild } from '@angular/core';
/** Plays both audio-only and video streams, including tracks added after joining. */
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
      <button
        type="button"
        class="absolute left-2 top-2 z-20 rounded-lg bg-surface-raised p-2 text-xs"
        (click)="play()"
      >
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
  private generation = 0;
  constructor() {
    effect(
      (onCleanup) => {
        const video = this.video()?.nativeElement;
        const stream = this.stream();
        const muted = this.muted();
        const generation = ++this.generation;
        if (!video) return;
        this.blocked.set(false);
        video.muted = muted;
        video.srcObject = stream;
        const replay = () => {
          if (this.generation === generation && stream) void this.tryPlay(video, generation);
        };
        const tracks = new Set<MediaStreamTrack>();
        const watch = () => {
          for (const track of stream?.getTracks() ?? [])
            if (!tracks.has(track)) {
              tracks.add(track);
              track.addEventListener('unmute', replay);
            }
          replay();
        };
        stream?.addEventListener('addtrack', watch);
        stream?.addEventListener('removetrack', replay);
        video.addEventListener('loadedmetadata', replay);
        video.addEventListener('canplay', replay);
        // Browsers can pause an initially silent video when audio is added later.
        video.addEventListener('pause', replay);
        watch();
        onCleanup(() => {
          ++this.generation;
          stream?.removeEventListener('addtrack', watch);
          stream?.removeEventListener('removetrack', replay);
          for (const track of tracks) track.removeEventListener('unmute', replay);
          video.removeEventListener('loadedmetadata', replay);
          video.removeEventListener('canplay', replay);
          video.removeEventListener('pause', replay);
          video.pause();
          video.srcObject = null;
        });
      },
      { allowSignalWrites: true }
    );
  }
  play(): void {
    const video = this.video()?.nativeElement;
    if (video) void this.tryPlay(video, this.generation);
  }
  private async tryPlay(video: HTMLVideoElement, generation: number): Promise<void> {
    try {
      await video.play();
      if (generation === this.generation) this.blocked.set(false);
    } catch (error) {
      if (generation === this.generation && (error as DOMException).name === 'NotAllowedError') this.blocked.set(true);
    }
  }
}
