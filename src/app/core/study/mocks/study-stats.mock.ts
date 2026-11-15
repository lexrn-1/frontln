import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { mockOk } from '../../http/mock-latency';
import { StudyStats } from '../models/study-stats.models';
import { StudyStatsService } from '../services/study-stats.service';

const DAYS = [
  { label: 'L', name: 'Lunes' },
  { label: 'M', name: 'Martes' },
  { label: 'X', name: 'Miércoles' },
  { label: 'J', name: 'Jueves' },
  { label: 'V', name: 'Viernes' },
  { label: 'S', name: 'Sábado' },
  { label: 'D', name: 'Domingo' }
];
const MINUTES = [95, 130, 60, 210, 120, 150, 70];

/** DATOS DE DEMOSTRACIÓN: cifras inventadas para visualizar el panel. No son del usuario. */
@Injectable()
export class MockStudyStatsService extends StudyStatsService {
  readonly isDemo = true;

  getSummary(): Observable<StudyStats> {
    const todayIndex = (new Date().getDay() + 6) % 7;
    return mockOk({
      streakDays: 12,
      studiedHours: 48,
      todayMinutes: 68,
      dailyGoalMinutes: 90,
      weekly: DAYS.map((d, i) => ({ ...d, minutes: MINUTES[i] })),
      weeklyChangePercent: 18,
      todayIndex
    });
  }
}
