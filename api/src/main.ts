import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureChatHttp } from './chat/configure-chat-http';
import { initSentry } from './observability/init-sentry';

const envFile = resolve(process.cwd(), '.env');
if (existsSync(envFile)) {
  process.loadEnvFile(envFile);
}

initSentry();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureChatHttp(app);
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
