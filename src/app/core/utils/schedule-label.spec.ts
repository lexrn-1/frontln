import { countdownLabel, scheduleLabel } from './schedule-label';

describe('schedule labels', () => {
  const now = new Date(2026, 10, 14, 12, 0, 0);

  it('labels today, tomorrow and later days', () => {
    expect(scheduleLabel(new Date(2026, 10, 14, 18, 0).toISOString(), now)).toBe('Hoy, 18:00');
    expect(scheduleLabel(new Date(2026, 10, 15, 16, 30).toISOString(), now)).toBe('Mañana, 16:30');
    expect(scheduleLabel(new Date(2026, 10, 18, 10, 0).toISOString(), now)).toContain('10:00');
  });

  it('tolerates invalid dates', () => {
    expect(scheduleLabel('not-a-date', now)).toBe('Sin horario');
  });

  it('formats countdowns', () => {
    const at = (min: number) => new Date(now.getTime() + min * 60_000).toISOString();
    expect(countdownLabel(at(42), now)).toBe('42 minutos');
    expect(countdownLabel(at(1), now)).toBe('1 minuto');
    expect(countdownLabel(at(65), now)).toBe('1 hora 5 min');
    expect(countdownLabel(at(0), now)).toBe('menos de un minuto');
  });
});
