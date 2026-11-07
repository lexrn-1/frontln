import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';

import { runtimeConfig } from '../config/runtime-config';

/** Instancia única de Firebase, creada al primer uso (no se carga si se usan mocks). */
export function firebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(runtimeConfig.firebase);
}

/** Activa Google Analytics solo si el navegador lo soporta (no falla con bloqueadores). */
export async function startAnalytics(): Promise<void> {
  try {
    const { getAnalytics, isSupported } = await import('firebase/analytics');
    if (await isSupported()) {
      getAnalytics(firebaseApp());
    }
  } catch {
    // Analytics es opcional: nunca debe impedir el arranque.
  }
}
