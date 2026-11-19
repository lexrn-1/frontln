import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { RealtimeService } from '../../../core/realtime/realtime.service';

export interface RoomMediaState {
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
}
/** Coalesces device changes, retries a failed ack and republishes on a new connection. */
@Injectable()
export class RoomMediaStateService {
  readonly error = signal<string | null>(null);
  private readonly realtime = inject(RealtimeService);
  private readonly connection = computed(() => this.realtime.snapshot()?.connectionId ?? null);
  private desired: { roomId: string; state: RoomMediaState } | null = null;
  private acknowledged = '';
  private running = false;
  private epoch = 0;
  private retry?: ReturnType<typeof setTimeout>;
  constructor() {
    effect(() => {
      const connection = this.connection();
      const status = this.realtime.status();
      if (connection && status === 'connected') untracked(() => void this.flush());
    });
    inject(DestroyRef).onDestroy(() => this.clear());
  }
  publish(roomId: string, state: RoomMediaState): void {
    if (!this.desired || this.desired.roomId !== roomId || JSON.stringify(this.desired.state) !== JSON.stringify(state))
      this.desired = { roomId, state: { ...state } };
    clearTimeout(this.retry);
    this.retry = undefined;
    void this.flush();
  }
  clear(): void {
    ++this.epoch;
    this.desired = null;
    this.acknowledged = '';
    clearTimeout(this.retry);
    this.retry = undefined;
    this.error.set(null);
  }
  private async flush(): Promise<void> {
    const desired = this.desired;
    const snapshot = this.realtime.snapshot();
    if (this.running || !desired || snapshot?.roomId !== desired.roomId || this.realtime.status() !== 'connected')
      return;
    const key = JSON.stringify([snapshot.connectionId, desired.roomId, desired.state]);
    if (key === this.acknowledged) return;
    this.running = true;
    const epoch = this.epoch;
    let failed = false;
    try {
      await this.realtime.request('media:update', desired.roomId, desired.state);
      if (epoch === this.epoch && this.realtime.snapshot()?.connectionId === snapshot.connectionId) {
        this.acknowledged = key;
        this.error.set(null);
      }
    } catch {
      failed = true;
      if (epoch === this.epoch && this.desired) {
        this.error.set('No pudimos sincronizar tus dispositivos con la sala. Reintentando…');
        this.retry = setTimeout(() => {
          this.retry = undefined;
          void this.flush();
        }, 1000);
      }
    } finally {
      this.running = false;
      // A new state/connection may have arrived while awaiting the previous ack.
      if (!failed && this.desired) void this.flush();
    }
  }
}
