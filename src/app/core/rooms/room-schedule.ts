import { RoomSchedule } from './models/room.models';

export const WEEKDAY_SHORT = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'] as const;

/** Lunes = 0 … domingo = 6. */
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;

function at(date: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Próxima ocurrencia (ISO UTC) de un horario a partir de `now`, o `null` si ya pasó (una sola vez). */
export function nextOccurrence(schedule: RoomSchedule, now: Date = new Date()): string | null {
  if (schedule.frequency === 'once') {
    if (!schedule.date) return null;
    const [y, mo, d] = schedule.date.split('-').map(Number);
    const when = at(new Date(y, mo - 1, d), schedule.time);
    return when > now ? when.toISOString() : null;
  }
  for (let i = 0; i < 8; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (schedule.frequency === 'weekly' && !(schedule.weekdays ?? []).includes(mondayIndex(day))) continue;
    const when = at(day, schedule.time);
    if (when > now) return when.toISOString();
  }
  return null;
}

/** "Todos los días, 18:00" o "lun y mié, 18:00" para horarios que se repiten. */
export function recurringLabel(schedule: RoomSchedule): string | null {
  if (schedule.frequency === 'daily') return `Todos los días, ${schedule.time}`;
  if (schedule.frequency === 'weekly') {
    const names = (schedule.weekdays ?? []).slice().sort().map((i) => WEEKDAY_SHORT[i]);
    const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : (names[0] ?? '');
    return `${list}, ${schedule.time}`;
  }
  return null;
}
