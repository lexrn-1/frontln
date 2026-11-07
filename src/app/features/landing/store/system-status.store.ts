import { Injectable, inject, signal } from '@angular/core';

import { AppError } from '../../../core/http/app-error';
import { SystemStatus } from '../models/system-status.model';
import { SystemStatusService } from '../services/system-status.service';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

@Injectable()
export class SystemStatusStore {
  private readonly service = inject(SystemStatusService);

  readonly state = signal<LoadState>('idle');
  readonly status = signal<SystemStatus | null>(null);
  readonly error = signal<string | null>(null);

  load(): void {
    this.state.set('loading');
    this.error.set(null);
    this.service.getStatus().subscribe({
      next: (status) => {
        this.status.set(status);
        this.state.set('success');
      },
      error: (error: unknown) => {
        this.error.set(AppError.from(error).message);
        this.state.set('error');
      }
    });
  }
}
