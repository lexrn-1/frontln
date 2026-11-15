import { Room } from '../models/room.models';

/**
 * DATOS DE DEMOSTRACIÓN de salas. Solo los consume `MockRoomsService`; ningún componente los
 * importa. Los horarios se calculan respecto a "ahora" para que el panel muestre una cuenta atrás.
 */
const minutes = (n: number) => new Date(Date.now() + n * 60_000).toISOString();

export function seedRooms(): Room[] {
  return [
    {
      id: 'SR-8462', name: 'Cálculo II · Integrales', subject: 'Matemáticas', category: 'matematicas',
      participantCount: 5, status: 'scheduled', startsAt: minutes(42), isHost: true, isMember: true, schedule: null
    },
    {
      id: 'SR-3D9F', name: 'Bioquímica · Final', subject: 'Medicina', category: 'ciencias',
      participantCount: 4, status: 'live', startsAt: minutes(-48), isHost: false, isMember: true, schedule: null
    },
    {
      id: 'SR-5K1M', name: 'Derecho Mercantil', subject: 'Derecho', category: 'derecho',
      participantCount: 3, status: 'scheduled', startsAt: minutes(24 * 60 + 15), isHost: true, isMember: true, schedule: { frequency: 'daily', time: '16:30' }
    },
    {
      id: 'SR-7QX2', name: 'Inglés B2 · Conversación', subject: 'Idiomas', category: 'idiomas',
      participantCount: 2, status: 'scheduled', startsAt: minutes(3 * 60), isHost: false, isMember: false, schedule: null
    },
    {
      id: 'SR-9PY1', name: 'Python · Estructuras de datos', subject: 'Programación', category: 'programacion',
      participantCount: 7, status: 'scheduled', startsAt: minutes(5 * 60), isHost: false, isMember: false, schedule: { frequency: 'weekly', time: '20:00', weekdays: [0, 2] }
    },
    {
      id: 'SR-2P6W', name: 'Física II · Campo eléctrico', subject: 'Física', category: 'ciencias',
      participantCount: 6, status: 'idle', startsAt: null, isHost: false, isMember: false, schedule: null
    }
  ];
}

/** Código que el modal "Unirse" sugiere en modo demostración (existe en el catálogo simulado). */
export const DEMO_JOIN_CODE = 'SR-7QX2';
