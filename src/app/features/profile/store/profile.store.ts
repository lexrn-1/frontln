import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CurrentUser } from '../../../core/auth/store/current-user.store';
import { AppError } from '../../../core/http/app-error';
import { Announcer } from '../../../core/layout/announcer.service';
import { StudyStatsStore } from '../../../core/study/store/study-stats.store';
import { AcademicInfo, UpdateProfileRequest } from '../models/profile.models';
import { ProfileService } from '../services/profile.service';

/** Estado de "Mi perfil": datos académicos, modo edición, guardado y borrado de cuenta. */
@Injectable()
export class ProfileStore {
  private readonly api = inject(ProfileService);
  private readonly statsStore = inject(StudyStatsStore);
  readonly user = inject(CurrentUser);
  private readonly announcer = inject(Announcer);

  readonly isDemo = this.api.isDemo;
  readonly stats = this.statsStore.stats;
  readonly statsIsDemo = this.statsStore.isDemo;

  readonly academic = signal<AcademicInfo>({ career: null, university: null });
  /** `false` si los datos académicos no están disponibles (p. ej. contrato pendiente). */
  readonly academicAvailable = signal(true);

  readonly editing = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  /** Errores por campo devueltos por el servidor (`nombres`, `apellidos`, `username`…). */
  readonly fieldErrors = signal<Record<string, string>>({});

  readonly deleteOpen = signal(false);
  readonly deleting = signal(false);
  readonly deleteError = signal<string | null>(null);

  readonly subtitle = computed(() => {
    const { career, university } = this.academic();
    return [career, university].filter(Boolean).join(' · ');
  });

  async load(): Promise<void> {
    void this.statsStore.load();
    try {
      this.academic.set(await firstValueFrom(this.api.getAcademicInfo()));
      this.academicAvailable.set(true);
    } catch {
      // Sin contrato o sin conexión: el perfil básico sigue visible y los datos académicos se marcan pendientes.
      this.academicAvailable.set(false);
    }
  }

  startEdit(): void {
    this.saveError.set(null);
    this.fieldErrors.set({});
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
    this.saveError.set(null);
    this.fieldErrors.set({});
  }

  /** Devuelve `true` si se guardó. Los errores quedan en `saveError`/`fieldErrors`. */
  async save(request: UpdateProfileRequest): Promise<boolean> {
    this.saving.set(true);
    this.saveError.set(null);
    this.fieldErrors.set({});
    try {
      const result = await firstValueFrom(this.api.update(request));
      this.user.applyProfile(result.profile);
      this.academic.set(result.academic);
      this.editing.set(false);
      this.announcer.announce('Perfil actualizado correctamente');
      return true;
    } catch (raw) {
      const error = AppError.from(raw);
      const byField: Record<string, string> = {};
      error.fieldErrors.forEach((f) => (byField[f.field] = f.message));
      if (error.code === 'username-taken') byField['username'] ??= 'Este nombre de usuario ya está en uso.';
      this.fieldErrors.set(byField);
      this.saveError.set(Object.keys(byField).length ? null : error.message);
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  async deleteAccount(): Promise<void> {
    this.deleting.set(true);
    this.deleteError.set(null);
    try {
      await firstValueFrom(this.api.deleteAccount());
      this.deleteOpen.set(false);
      await this.user.logout();
    } catch (error) {
      this.deleteError.set(AppError.from(error).message);
    } finally {
      this.deleting.set(false);
    }
  }
}
