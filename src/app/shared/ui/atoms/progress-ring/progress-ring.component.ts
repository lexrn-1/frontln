import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Anillo de progreso neumórfico (0–100) con valor centrado. Expone el valor como imagen con texto. */
@Component({
  selector: 'app-progress-ring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative grid place-items-center"
      role="img"
      [attr.aria-label]="label() + ': ' + clamped() + '%'"
      [style.width.px]="size()"
      [style.height.px]="size()"
    >
      <svg class="absolute inset-0 -rotate-90" [attr.viewBox]="'0 0 ' + size() + ' ' + size()" aria-hidden="true">
        <circle [attr.cx]="size() / 2" [attr.cy]="size() / 2" [attr.r]="radius()" fill="none" stroke="var(--color-border)" [attr.stroke-width]="stroke()" />
        <circle
          [attr.cx]="size() / 2" [attr.cy]="size() / 2" [attr.r]="radius()" fill="none"
          stroke="var(--color-primary)" stroke-linecap="round" [attr.stroke-width]="stroke()"
          [attr.stroke-dasharray]="circumference()" [attr.stroke-dashoffset]="offset()"
        />
      </svg>
      <div class="grid place-items-center rounded-full bg-surface-raised text-center shadow-raised" [style.width.px]="size() - stroke() * 2.6" [style.height.px]="size() - stroke() * 2.6" aria-hidden="true">
        <span>
          <span class="block font-display font-medium leading-none text-ink" [style.font-size.px]="size() * 0.27">{{ display() ?? clamped() }}</span>
          <span class="mt-1.5 block text-[11px] font-medium text-primary-dark">{{ caption() }}</span>
        </span>
      </div>
    </div>
  `,
  host: { class: 'inline-block' }
})
export class ProgressRingComponent {
  readonly value = input.required<number>();
  readonly size = input(120);
  readonly stroke = input(10);
  /** Texto central; por defecto, el porcentaje. */
  readonly display = input<string | number | null>(null);
  readonly label = input('Progreso');
  readonly caption = input('');

  protected readonly clamped = computed(() => Math.round(Math.min(100, Math.max(0, this.value()))));
  protected readonly radius = computed(() => (this.size() - this.stroke()) / 2);
  protected readonly circumference = computed(() => 2 * Math.PI * this.radius());
  protected readonly offset = computed(() => this.circumference() * (1 - this.clamped() / 100));
}
