import type { INestApplication } from '@nestjs/common';
import { applyDashboardCors } from './dashboard-cors';

export function configureDashboardHttp(app: INestApplication): void {
  app.getHttpAdapter().getInstance().use(applyDashboardCors);
}
