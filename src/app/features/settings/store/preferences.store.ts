import { Injectable, signal } from '@angular/core';

export interface Preferences {
  sessionReminders: boolean;
  roomInvites: boolean;
  activitySounds: boolean;
  privateProfile: boolean;
  autoCaptions: boolean;
  highContrast: boolean;
  language: string;
  timezone: string;
}

const KEY = 'frontmeet.preferences.v1';

/**
 * Preferencias de interfaz de Configuración. El plan de trabajo no define ningún endpoint para
 * ellas, así que se guardan SOLO en este navegador (`localStorage`); aún no se sincronizan con la
 * cuenta ni activan notificaciones, subtítulos o sonidos (docs/BACKEND-PENDING.md).
 */
@Injectable()
export class PreferencesStore {
  readonly prefs = signal<Preferences>(this.read());

  set<K extends keyof Preferences>(key: K, value: Preferences[K]): void {
    this.prefs.update((p) => ({ ...p, [key]: value }));
    try {
      localStorage.setItem(KEY, JSON.stringify(this.prefs()));
    } catch {
      /* sin almacenamiento: la preferencia vive solo durante la sesión de la página */
    }
  }

  private read(): Preferences {
    const defaults: Preferences = {
      sessionReminders: true,
      roomInvites: true,
      activitySounds: false,
      privateProfile: true,
      autoCaptions: false,
      highContrast: false,
      language: 'es',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Madrid'
    };
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<Preferences>) } : defaults;
    } catch {
      return defaults;
    }
  }
}
