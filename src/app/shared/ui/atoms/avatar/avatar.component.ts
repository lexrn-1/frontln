import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AvatarTone = 'peach' | 'mint' | 'sky' | 'rose' | 'lavender' | 'ink';

const TONES: Record<AvatarTone, string> = {
  peach: 'bg-tile-peach text-ink',
  mint: 'bg-tile-mint text-ink',
  sky: 'bg-tile-sky text-ink',
  rose: 'bg-tile-rose text-ink',
  lavender: 'bg-lavender text-ink',
  ink: 'bg-ink text-surface-raised'
};

/** Avatar con iniciales sobre un tono pastel. Decorativo: el nombre se muestra aparte. */
@Component({
  selector: 'app-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span
    [class]="toneClass()"
    [style.width.px]="size()"
    [style.height.px]="size()"
    [style.font-size.px]="size() * 0.36"
    aria-hidden="true"
    >{{ initials() }}</span
  >`,
  host: { class: 'inline-flex' }
})
export class AvatarComponent {
  readonly name = input('');
  readonly tone = input<AvatarTone | string>('peach');
  readonly size = input(36);

  protected readonly initials = computed(() =>
    this.name()
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
  );

  protected readonly toneClass = computed(
    () => `grid place-items-center rounded-full font-semibold ring-2 ring-surface-raised shadow-inset ${TONES[this.tone() as AvatarTone] ?? TONES.peach}`
  );
}
