import { Observable } from 'rxjs';

import { contractPending } from '../../http/contract-pending';
import { StudyStats } from '../models/study-stats.models';

/** Consulta de estadísticas de estudio (sin estado). Ver `StudyStatsStore`. */
export abstract class StudyStatsService {
  abstract readonly isDemo: boolean;
  abstract getSummary(): Observable<StudyStats>;
}

/** El plan de trabajo no define este endpoint: queda preparado sin inventar ruta ni DTO. */
export class HttpStudyStatsService extends StudyStatsService {
  readonly isDemo = false;
  getSummary(): Observable<StudyStats> {
    return contractPending('Estadísticas de estudio (endpoint no definido en el plan)');
  }
}
