import './instrument';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureChatHttp } from './chat/configure-chat-http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureChatHttp(app);
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

void bootstrap();
