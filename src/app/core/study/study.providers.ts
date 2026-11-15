import { Provider } from '@angular/core';

import { runtimeConfig } from '../config/runtime-config';
import { isDevAccessActive } from '../dev/dev-access';
import { MockStudyStatsService } from './mocks/study-stats.mock';
import { HttpStudyStatsService, StudyStatsService } from './services/study-stats.service';

export function provideStudyStats(): Provider[] {
  const useMock = runtimeConfig.useMocks || isDevAccessActive();
  return [{ provide: StudyStatsService, useClass: useMock ? MockStudyStatsService : HttpStudyStatsService }];
}
