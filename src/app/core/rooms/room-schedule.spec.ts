import { nextOccurrence, recurringLabel } from './room-schedule';

describe('room schedule', () => {
  const now = new Date(2026, 10, 16, 12, 0, 0); // lunes 16 nov 2026, 12:00

  it('one-off: returns the date if future, null if past', () => {
    expect(nextOccurrence({ frequency: 'once', time: '18:00', date: '2026-11-16' }, now)).toBe(new Date(2026, 10, 16, 18, 0).toISOString());
    expect(nextOccurrence({ frequency: 'once', time: '09:00', date: '2026-11-16' }, now)).toBeNull();
  });

  it('daily: today if the time is ahead, otherwise tomorrow', () => {
    expect(nextOccurrence({ frequency: 'daily', time: '18:00' }, now)).toBe(new Date(2026, 10, 16, 18, 0).toISOString());
    expect(nextOccurrence({ frequency: 'daily', time: '08:00' }, now)).toBe(new Date(2026, 10, 17, 8, 0).toISOString());
  });

  it('weekly: next selected weekday (0 = lunes)', () => {
    expect(nextOccurrence({ frequency: 'weekly', time: '10:00', weekdays: [2] }, now)).toBe(new Date(2026, 10, 18, 10, 0).toISOString());
    expect(nextOccurrence({ frequency: 'weekly', time: '10:00', weekdays: [0] }, now)).toBe(new Date(2026, 10, 23, 10, 0).toISOString());
  });

  it('labels recurring schedules', () => {
    expect(recurringLabel({ frequency: 'daily', time: '16:30' })).toBe('Todos los días, 16:30');
    expect(recurringLabel({ frequency: 'weekly', time: '20:00', weekdays: [0, 2] })).toBe('lun y mié, 20:00');
    expect(recurringLabel({ frequency: 'once', time: '20:00', date: '2026-11-20' })).toBeNull();
  });
});
