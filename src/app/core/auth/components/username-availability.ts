import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, filter, map, of, switchMap, tap } from 'rxjs';

import { AuthStore } from '../store/auth.store';

export type UsernameState = 'idle' | 'checking' | 'available' | 'taken' | 'error';

/**
 * Comprueba la disponibilidad del username mientras se escribe (orientativo: el servidor
 * decide al crear el perfil). Debe llamarse en un contexto de inyección.
 */
export function trackUsernameAvailability(control: AbstractControl<string>) {
  const store = inject(AuthStore);
  const destroyRef = inject(DestroyRef);
  const state = signal<UsernameState>('idle');

  control.valueChanges
    .pipe(
      map((v) => (v ?? '').trim().toLowerCase()),
      distinctUntilChanged(),
      tap(() => state.set('idle')),
      debounceTime(450),
      filter(() => control.valid),
      tap(() => state.set('checking')),
      switchMap((username) =>
        store.checkUsername(username).pipe(
          map((r) => (r.available ? 'available' : 'taken') as UsernameState),
          catchError(() => of<UsernameState>('error'))
        )
      ),
      takeUntilDestroyed(destroyRef)
    )
    .subscribe((result) => {
      state.set(result);
      if (result === 'taken') {
        control.setErrors({ ...(control.errors ?? {}), taken: true });
        control.markAsTouched();
      }
    });

  return state.asReadonly();
}
