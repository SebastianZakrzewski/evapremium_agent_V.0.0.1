import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { ChatModule } from './chat/chat.module';
import { ContextTreeModule } from './context-tree/context-tree.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LeadModule } from './lead/lead.module';
import { mastraHttpModules } from './mastra/mastra-http.module';
import { PricingModule } from './pricing/pricing.module';
import { TemplateCascadeModule } from './templates/template-cascade.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    TemplateCascadeModule,
    PricingModule,
    ContextTreeModule,
    ChatModule,
    DashboardModule,
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
export class AppModule {}
