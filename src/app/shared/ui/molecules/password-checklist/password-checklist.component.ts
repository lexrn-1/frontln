import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PASSWORD_RULES } from '../../../validators/auth.validators';
import { IconComponent } from '../../atoms/icon/icon.component';

/** Política de contraseña visible, con el estado de cada regla. */
@Component({
  selector: 'app-password-checklist',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="mt-2 grid grid-cols-2 gap-x-3 gap-y-1" [id]="listId()" aria-label="Requisitos de la contraseña">
      @for (rule of rules(); track rule.key) {
        <li class="flex items-center gap-1.5 text-xs" [class.text-success]="rule.ok" [class.text-muted]="!rule.ok">
          <app-icon [name]="rule.ok ? 'check_circle' : 'radio_button_unchecked'" [size]="14" />
          <span>{{ rule.label }}<span class="sr-only">{{ rule.ok ? ': cumplido' : ': pendiente' }}</span></span>
        </li>
      }
    </ul>
  `,
  host: { class: 'block' }
})
export class PasswordChecklistComponent {
  readonly value = input('');
  readonly listId = input('password-rules');

  protected readonly rules = computed(() =>
    PASSWORD_RULES.map((rule) => ({ key: rule.key, label: rule.label, ok: rule.test(this.value() ?? '') }))
  );
}
