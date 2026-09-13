import type { INestApplication } from '@nestjs/common';
import { parseMastraQueryString } from '../mastra/coerce-mastra-query';
import {
  mastraStudioCorsOrigins,
  shouldMountMastraHttp,
} from '../mastra/studio-http';
import { chatCorsOrigins } from './shop-cors';

export function configureChatHttp(app: INestApplication): void {
  app.getHttpAdapter().getInstance().set('query parser', parseMastraQueryString);
  app.enableCors({
    origin: [
      ...chatCorsOrigins(process.env.WIDGET_ORIGIN),
      ...mastraStudioCorsOrigins({
        httpEnabled: shouldMountMastraHttp(process.env),
        extraOrigin: process.env.MASTRA_STUDIO_ORIGIN,
      }),
    ],
  });
}
