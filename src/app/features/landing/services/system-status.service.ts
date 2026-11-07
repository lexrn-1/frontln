import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { runtimeConfig } from '../../../core/config/runtime-config';
import { ApiResponse } from '../../../core/http/api-response.model';
import { mockOk } from '../../../core/http/mock-latency';
import { SystemStatus } from '../models/system-status.model';

/** Estado del backend. Sin estado propio: lo guarda `SystemStatusStore`. */
export abstract class SystemStatusService {
  abstract getStatus(): Observable<SystemStatus>;
}

@Injectable()
export class HttpSystemStatusService extends SystemStatusService {
  private readonly http = inject(HttpClient);

  getStatus(): Observable<SystemStatus> {
    return this.http
      .get<ApiResponse<SystemStatus>>(`${runtimeConfig.apiUrl}/v1/health`)
      .pipe(map((r) => r.data));
  }
}

@Injectable()
export class MockSystemStatusService extends SystemStatusService {
  getStatus(): Observable<SystemStatus> {
    return mockOk({
      api: 'UP',
      firestore: 'UP',
      sample: { label: 'salas de estudio activas', value: 128 },
      version: '0.1.0-mock',
      checkedAt: new Date().toISOString()
    });
  }
}

export function provideSystemStatus() {
  return {
    provide: SystemStatusService,
    useClass: runtimeConfig.useMocks ? MockSystemStatusService : HttpSystemStatusService
  };
}
