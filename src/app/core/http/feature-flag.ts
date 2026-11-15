import { Observable } from 'rxjs';

import { runtimeConfig } from '../config/runtime-config';
import { contractPending } from './contract-pending';

type Feature = keyof typeof runtimeConfig.features;

/**
 * Ejecuta `call` solo si el contrato de esa funcionalidad ya está confirmado en backend
 * (`runtimeConfig.features`). Si no, devuelve `contract-pending` sin tocar la red.
 */
export function whenEnabled<T>(feature: Feature, operation: string, call: () => Observable<T>): Observable<T> {
  return runtimeConfig.features[feature] ? call() : contractPending<T>(operation);
}
