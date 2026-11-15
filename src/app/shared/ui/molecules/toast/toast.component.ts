import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { IconComponent } from '../../atoms/icon/icon.component';

/** Aviso breve y anunciado (`role="status"`). La región existe siempre; el texto aparece al haber mensaje. */
@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 sm:inset-x-auto sm:right-6 sm:justify-end" role="status" aria-live="polite">
      @if (message()) {
        <p class="pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-surface-raised py-2.5 pl-2.5 pr-4 text-[13px] font-medium text-ink shadow-raised">
          <span class="neu-chip h-9 w-9 shrink-0" [class]="tone() === 'error' ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success'">
            <app-icon [name]="tone() === 'error' ? 'error' : 'check'" [size]="18" />
          </span>
          <span class="flex-1">{{ message() }}</span>
        </p>
      }
    </div>
  `
})
export class ToastComponent {
  readonly message = input('');
  readonly tone = input<'ok' | 'error'>('ok');
}
