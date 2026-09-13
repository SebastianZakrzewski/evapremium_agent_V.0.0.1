import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { ChatModule } from './chat/chat.module';
import { ContextTreeModule } from './context-tree/context-tree.module';
import { LeadModule } from './lead/lead.module';
import { EmptyMastraFeedbackMiddleware } from './mastra/empty-mastra-feedback.middleware';
import { mastraHttpModules } from './mastra/mastra-http.module';
import { MASTRA_FEEDBACK_LIST_PATH } from './mastra/studio-http';
import { PricingModule } from './pricing/pricing.module';
import { TemplateCascadeModule } from './templates/template-cascade.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    TemplateCascadeModule,
    PricingModule,
    ContextTreeModule,
    ChatModule,
    LeadModule,
    ...mastraHttpModules(),
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(EmptyMastraFeedbackMiddleware).forRoutes({
      path: MASTRA_FEEDBACK_LIST_PATH.replace(/^\//, ''),
      method: RequestMethod.GET,
    });
  }
}
