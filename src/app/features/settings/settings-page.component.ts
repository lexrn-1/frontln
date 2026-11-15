import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';

import { CurrentUser } from '../../core/auth/store/current-user.store';
import { runtimeConfig } from '../../core/config/runtime-config';
import { IconComponent } from '../../shared/ui/atoms/icon/icon.component';
import { SelectComponent, SelectOption } from '../../shared/ui/atoms/select/select.component';
import { SpinnerComponent } from '../../shared/ui/atoms/spinner/spinner.component';
import { TextInputComponent } from '../../shared/ui/atoms/text-input/text-input.component';
import { ToggleSwitchComponent } from '../../shared/ui/atoms/toggle-switch/toggle-switch.component';
import { FormFieldComponent } from '../../shared/ui/molecules/form-field/form-field.component';
import { controlError, focusFirstInvalid } from '../../shared/utils/form-errors';
import { institutionalEmailValidator } from '../../shared/validators/auth.validators';
import { PreferenceRowComponent } from './components/preference-row.component';
import { PreferenceSectionComponent } from './components/preference-section.component';
import { PreferencesStore } from './store/preferences.store';
import { SettingsStore } from './store/settings.store';

/**
 * Configuración (ruta `/configuracion`, dentro del shell). El plan de trabajo solo contempla aquí
 * el cambio de correo con reautenticación (US-04) y el cierre de sesión (US-03); no hay más ajustes.
 */
@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    FormFieldComponent,
    IconComponent,
    PreferenceRowComponent,
    PreferenceSectionComponent,
    ReactiveFormsModule,
    SelectComponent,
    SpinnerComponent,
    TextInputComponent,
    ToggleSwitchComponent
  ],
  providers: [SettingsStore, PreferencesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto max-w-4xl space-y-6">
      <p class="rounded-xl bg-canvas px-4 py-2.5 text-xs text-muted shadow-inset" role="note">
        Las preferencias se guardan solo en este dispositivo; su efecto (avisos, subtítulos, sonidos) se activará cuando se integren esas funciones.
      </p>

      <app-preference-section title="Notificaciones" icon="notifications">
        <app-preference-row title="Recordatorios de sesiones" description="Recibe un aviso 15 minutos antes" descriptionId="pref-reminders">
          <app-toggle-switch label="Recordatorios de sesiones" describedBy="pref-reminders" [checked]="p().sessionReminders" (checkedChange)="prefs.set('sessionReminders', $event)" />
        </app-preference-row>
        <app-preference-row title="Invitaciones a salas" description="Te avisaremos cuando alguien te invite" descriptionId="pref-invites">
          <app-toggle-switch label="Invitaciones a salas" describedBy="pref-invites" [checked]="p().roomInvites" (checkedChange)="prefs.set('roomInvites', $event)" />
        </app-preference-row>
        <app-preference-row title="Sonidos de actividad" description="Sonidos sutiles en el chat y la sala" descriptionId="pref-sounds">
          <app-toggle-switch label="Sonidos de actividad" describedBy="pref-sounds" [checked]="p().activitySounds" (checkedChange)="prefs.set('activitySounds', $event)" />
        </app-preference-row>
      </app-preference-section>

      <app-preference-section title="Privacidad" icon="verified_user">
        <app-preference-row title="Perfil privado" description="Solo tus compañeros pueden ver tu perfil" descriptionId="pref-private">
          <app-toggle-switch label="Perfil privado" describedBy="pref-private" [checked]="p().privateProfile" (checkedChange)="prefs.set('privateProfile', $event)" />
        </app-preference-row>
      </app-preference-section>

      <app-preference-section title="Accesibilidad" icon="accessibility_new">
        <app-preference-row title="Subtítulos automáticos" description="Muestra transcripciones durante las llamadas" descriptionId="pref-captions">
          <app-toggle-switch label="Subtítulos automáticos" describedBy="pref-captions" [checked]="p().autoCaptions" (checkedChange)="prefs.set('autoCaptions', $event)" />
        </app-preference-row>
        <app-preference-row title="Contraste reforzado" description="Aumenta el contraste de textos y controles" descriptionId="pref-contrast">
          <app-toggle-switch label="Contraste reforzado" describedBy="pref-contrast" [checked]="p().highContrast" (checkedChange)="prefs.set('highContrast', $event)" />
        </app-preference-row>
      </app-preference-section>

      <app-preference-section title="Preferencias" icon="tune">
        <app-preference-row title="Idioma" description="Idioma de la interfaz" descriptionId="pref-language">
          <app-select class="w-56" label="Idioma" describedBy="pref-language" [options]="languages" [value]="p().language" (valueChange)="prefs.set('language', $event)" />
        </app-preference-row>
        <app-preference-row title="Zona horaria" description="Para recordatorios y agenda" descriptionId="pref-timezone">
          <app-select class="w-64" label="Zona horaria" describedBy="pref-timezone" [options]="timezones()" [value]="p().timezone" (valueChange)="prefs.set('timezone', $event)" />
        </app-preference-row>
      </app-preference-section>

      @if (store.isDemo) {
        <p class="rounded-xl bg-warning-soft px-4 py-2 text-xs font-medium text-warning" role="note">
          Modo demostración: no se envía ningún correo real.
        </p>
      }

      <section class="rounded-[28px] bg-surface-raised p-7 shadow-raised" aria-labelledby="email-title">
        <p class="eyebrow">Cuenta</p>
        <h2 id="email-title" class="mt-1 text-lg font-medium text-ink">Correo de acceso</h2>
        <p class="mt-1 text-[13px] text-muted">
          Correo actual: <strong class="font-semibold text-ink">{{ user.profile()?.email }}</strong>
        </p>

        @if (user.provider() === 'google') {
          <p class="mt-4 flex items-start gap-2 rounded-xl bg-canvas px-3.5 py-3 text-[13px] text-muted shadow-inset">
            <app-icon name="info" [size]="17" class="mt-px" />
            Accedes con Google: el correo de acceso se gestiona desde tu cuenta de Google.
          </p>
        } @else {
          <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="mt-5 space-y-4" aria-label="Cambiar correo">
            <app-form-field label="Nuevo correo" forId="settings-email" [error]="err('newEmail')">
              <app-text-input inputId="settings-email" type="email" formControlName="newEmail" icon="menu_book" placeholder="tu.nombre@universidad.edu" autocomplete="email" inputmode="email" [required]="true" [invalid]="!!err('newEmail')" [describedBy]="err('newEmail') ? 'settings-email-error' : null" />
            </app-form-field>
            <app-form-field label="Contraseña actual" forId="settings-password" [error]="err('currentPassword')" hint="La pedimos para confirmar que eres tú.">
              <app-text-input inputId="settings-password" type="password" formControlName="currentPassword" icon="lock" autocomplete="current-password" [required]="true" [invalid]="!!err('currentPassword')" [describedBy]="err('currentPassword') ? 'settings-password-error' : 'settings-password-hint'" />
            </app-form-field>

            @if (store.error()) {
              <p class="flex items-start gap-2 rounded-xl bg-danger-soft px-3.5 py-3 text-sm text-danger" role="alert">
                <app-icon name="error" [size]="18" class="mt-px" /> <span>{{ store.error() }}</span>
              </p>
            }
            @if (store.verificationSentTo(); as sent) {
              <p class="flex items-start gap-2 rounded-xl bg-success-soft px-3.5 py-3 text-sm text-success" role="status">
                <app-icon name="mark_email_read" [size]="18" class="mt-px" />
                <span>Enviamos un enlace de verificación a {{ sent }}. Tu correo actual seguirá activo hasta que lo confirmes.</span>
              </p>
            }

            <div class="flex justify-end">
              <button type="submit" class="btn-primary h-10" [disabled]="store.pending()">
                @if (store.pending()) { <app-spinner [size]="14" /> <span>Enviando…</span> } @else { <span>Cambiar correo</span> }
              </button>
            </div>
          </form>
        }
      </section>

      <section class="flex flex-col gap-4 rounded-[28px] bg-surface-raised p-7 shadow-raised sm:flex-row sm:items-center sm:justify-between" aria-labelledby="session-title">
        <div>
          <p class="eyebrow">Sesión</p>
          <h2 id="session-title" class="mt-1 text-lg font-medium text-ink">Cerrar sesión</h2>
          <p class="mt-1 text-[13px] text-muted">Se limpia la sesión en este dispositivo.</p>
        </div>
        <button type="button" class="btn-ghost h-10 shrink-0 text-primary" (click)="user.logout()">
          <app-icon name="logout" [size]="16" /> Cerrar sesión
        </button>
      </section>
    </div>
  `
})
export class SettingsPageComponent {
  protected readonly store = inject(SettingsStore);
  protected readonly prefs = inject(PreferencesStore);
  protected readonly p = this.prefs.prefs;
  protected readonly languages: SelectOption[] = [{ value: 'es', label: 'Español' }];
  /** Zonas habituales más la del dispositivo; el desfase (GMT±n) se calcula con Intl. */
  protected readonly timezones = computed<SelectOption[]>(() => {
    const zones = new Map<string, string>([
      ['Europe/Madrid', 'Madrid'],
      ['America/Bogota', 'Bogotá'],
      ['America/Mexico_City', 'Ciudad de México'],
      ['America/Lima', 'Lima'],
      ['America/Santiago', 'Santiago'],
      ['America/Argentina/Buenos_Aires', 'Buenos Aires']
    ]);
    const current = this.p().timezone;
    if (!zones.has(current)) zones.set(current, current.split('/').pop()!.replace(/_/g, ' '));
    return [...zones].map(([value, city]) => ({ value, label: `${city} (${offsetLabel(value)})` }));
  });
  protected readonly user = inject(CurrentUser);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly submitted = signal(false);

  protected readonly form = this.fb.group({
    newEmail: ['', [Validators.required, Validators.email, institutionalEmailValidator(runtimeConfig.institutionalDomains), (c: AbstractControl): ValidationErrors | null =>
      c.value && c.value.trim().toLowerCase() === (this.user.profile()?.email ?? '').toLowerCase() ? { same: true } : null]],
    currentPassword: ['', [Validators.required]]
  });

  private readonly messages: Record<string, Record<string, string>> = {
    newEmail: {
      required: 'Escribe tu nuevo correo.',
      email: 'Introduce un correo válido.',
      institutional: 'Usa un correo universitario válido.',
      same: 'Es el mismo correo que ya usas.'
    },
    currentPassword: { required: 'Escribe tu contraseña actual.' }
  };

  protected err(name: string): string | null {
    return controlError(this.form.get(name), this.messages[name], this.submitted());
  }

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      focusFirstInvalid(this.host.nativeElement);
      return;
    }
    const { newEmail, currentPassword } = this.form.getRawValue();
    if (await this.store.changeEmail({ newEmail: newEmail.trim(), currentPassword })) {
      this.form.reset();
      this.submitted.set(false);
    }
  }
}

/** "GMT+1" de una zona horaria IANA en este momento. */
function offsetLabel(timeZone: string): string {
  try {
    return (
      new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'shortOffset' })
        .formatToParts(new Date())
        .find((part) => part.type === 'timeZoneName')?.value ?? ''
    );
  } catch {
    return '';
  }
}
