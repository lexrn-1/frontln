import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Fila de preferencia: título y descripción a la izquierda y el control proyectado a la derecha. */
@Component({
  selector: 'app-preference-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-center justify-between gap-6 py-5">
      <div class="min-w-0">
        <p class="text-[15px] font-semibold text-ink">{{ title() }}</p>
        <p class="mt-1 text-[13px] text-muted" [attr.id]="descriptionId()">{{ description() }}</p>
      </div>
      <ng-content />
    </div>
  `,
  host: { class: 'block' }
})
export class PreferenceRowComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  /** Id de la descripción, para enlazarla con `aria-describedby` del control. */
  readonly descriptionId = input<string | null>(null);
}
