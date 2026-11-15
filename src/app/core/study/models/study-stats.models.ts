/**
 * Estadísticas de estudio del usuario. El plan de trabajo no define ningún endpoint ni campos de
 * estadísticas (racha, horas, ritmo semanal, meta diaria): backend debe publicarlos
 * (docs/BACKEND-PENDING.md). Hasta entonces solo los alimenta el mock de demostración.
 */
export interface WeekdayActivity {
  /** Inicial del día (L, M, X, J, V, S, D). */
  label: string;
  /** Nombre completo, para lectores de pantalla. */
  name: string;
  minutes: number;
}

export interface StudyStats {
  streakDays: number;
  studiedHours: number;
  /** Minutos estudiados hoy. */
  todayMinutes: number;
  /** Meta diaria en minutos. */
  dailyGoalMinutes: number;
  weekly: WeekdayActivity[];
  /** Variación frente a la semana anterior, en %. */
  weeklyChangePercent: number;
  /** Índice (0 = lunes) del día en curso, para resaltar su barra. */
  todayIndex: number;
}
