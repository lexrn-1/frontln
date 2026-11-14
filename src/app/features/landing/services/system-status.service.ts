import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, switchMap, timeout } from 'rxjs';
import { runtimeConfig } from '../../../core/config/runtime-config';
import { mockOk } from '../../../core/http/mock-latency';
import { ReadinessResponse, SystemStatus } from '../models/system-status.model';

export abstract class SystemStatusService { abstract getStatus(): Observable<SystemStatus>; }
@Injectable()
export class HttpSystemStatusService extends SystemStatusService {
  private readonly http = inject(HttpClient);
  getStatus(): Observable<SystemStatus> {
    return this.http.get<ReadinessResponse>(runtimeConfig.healthUrl).pipe(timeout(15000), switchMap((ready) => {
      const status = {
        api: ready.status, firestore: ready.checks.find((c) => c.name === 'firestore')?.status ?? 'DOWN',
        checkedAt: new Date().toISOString()
      };
      return this.http.get<{message:string}>(`${runtimeConfig.apiUrl}/demo`).pipe(
        timeout(15000),
        map((demo): SystemStatus => ({...status,sampleMessage:demo.message,demoState:'available'})),
        catchError((error: unknown) => of<SystemStatus>({...status,sampleMessage:null,
          demoState:error instanceof HttpErrorResponse && error.status === 404 ? 'missing':'unavailable'}))
      );
    }));
  }
}
@Injectable()
export class MockSystemStatusService extends SystemStatusService {
  getStatus(): Observable<SystemStatus> {
    return mockOk({api:'UP',firestore:'UP',sampleMessage:'Mensaje de demostración simulado',demoState:'available',checkedAt:new Date().toISOString()});
  }
}
export function provideSystemStatus() {
  return {provide:SystemStatusService,useClass:runtimeConfig.useMocks ? MockSystemStatusService : HttpSystemStatusService};
}
