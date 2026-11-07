import { UserProfile } from '../../models/auth.models';

/**
 * "Base de datos" simulada en localStorage que comparten los adaptadores mock de
 * identidad y de API. Desaparece al conectar Firebase y backend-api.
 *
 * Cuenta de prueba: marina.lopez@universidad.edu / Estudio2026
 */
export interface MockAccount {
  uid: string;
  email: string;
  password: string | null;
  displayName: string | null;
  provider: 'password' | 'google';
}

interface MockState {
  accounts: MockAccount[];
  profiles: UserProfile[];
  sessionUid: string | null;
}

const KEY = 'frontmeet.mock-db.v1';

const SEED: MockState = {
  accounts: [
    {
      uid: 'u-marina',
      email: 'marina.lopez@universidad.edu',
      password: 'Estudio2026',
      displayName: 'Marina López',
      provider: 'password'
    }
  ],
  profiles: [
    {
      uid: 'u-marina',
      nombres: 'Marina',
      apellidos: 'López',
      username: 'marina.lopez',
      email: 'marina.lopez@universidad.edu',
      avatar: 'rose',
      createdAt: '2026-10-01T15:00:00Z'
    }
  ],
  sessionUid: null
};

export const mockDb = {
  read(): MockState {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as MockState) : structuredClone(SEED);
    } catch {
      return structuredClone(SEED);
    }
  },

  write(state: MockState): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // Almacenamiento no disponible: el mock sigue en memoria durante la petición.
    }
  },

  update(fn: (state: MockState) => void): MockState {
    const state = this.read();
    fn(state);
    this.write(state);
    return state;
  }
};
