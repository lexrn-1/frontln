const timeFormat = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false });
const weekdayFormat = new Intl.DateTimeFormat('es', { weekday: 'short' });

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "Hoy, 18:00", "Mañana, 16:30" o "lun, 10:00" a partir de una fecha ISO UTC. */
export function scheduleLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Sin horario';
  const dayDiff = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
  const time = timeFormat.format(date);
  if (dayDiff === 0) return `Hoy, ${time}`;
  if (dayDiff === 1) return `Mañana, ${time}`;
  return `${weekdayFormat.format(date).replace('.', '')}, ${time}`;
}

/** Texto de cuenta atrás ("42 minutos", "1 hora 5 min") para una sesión próxima. */
export function countdownLabel(iso: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.round((new Date(iso).getTime() - now.getTime()) / 60_000));
  if (minutes < 1) return 'menos de un minuto';
  if (minutes < 60) return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const h = hours === 1 ? '1 hora' : `${hours} horas`;
  return rest ? `${h} ${rest} min` : h;
}
