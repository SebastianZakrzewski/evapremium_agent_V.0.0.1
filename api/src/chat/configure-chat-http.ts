import type { INestApplication } from '@nestjs/common';
import { SHOP_CORS_ORIGINS } from './shop-cors';

export function configureChatHttp(app: INestApplication): void {
  app.enableCors({
    origin: [...SHOP_CORS_ORIGINS],
  });
}
