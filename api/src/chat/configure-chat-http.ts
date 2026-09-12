import type { INestApplication } from '@nestjs/common';
import { chatCorsOrigins } from './shop-cors';

export function configureChatHttp(app: INestApplication): void {
  app.enableCors({
    origin: chatCorsOrigins(process.env.WIDGET_ORIGIN),
  });
}
