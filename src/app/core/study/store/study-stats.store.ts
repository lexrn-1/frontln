import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AppError } from '../../http/app-error';
import { LoadState } from '../../rooms/store/rooms.store';
import { StudyStats } from '../models/study-stats.models';
import { StudyStatsService } from '../services/study-stats.service';

/** Estadísticas compartidas por la barra lateral (racha), el panel y el perfil. */
@Injectable({ providedIn: 'root' })
export class StudyStatsStore {
  private readonly api = inject(StudyStatsService);

  readonly isDemo = this.api.isDemo;
  readonly stats = signal<StudyStats | null>(null);
  readonly state = signal<LoadState>('idle');
  readonly error = signal<string | null>(null);

  async load(force = false): Promise<void> {
    if (!force && (this.state() === 'loading' || this.state() === 'ready')) return;
    this.state.set('loading');
    this.error.set(null);
    try {
      this.stats.set(await firstValueFrom(this.api.getSummary()));
      this.state.set('ready');
    } catch (error) {
      this.error.set(AppError.from(error).message);
      this.state.set('error');
    }
  }
}
