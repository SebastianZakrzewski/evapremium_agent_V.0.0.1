import { Module } from '@nestjs/common';
import { ChatModule } from './chat/chat.module';
import { ContextTreeModule } from './context-tree/context-tree.module';
import { LeadModule } from './lead/lead.module';
import { PricingModule } from './pricing/pricing.module';
import { TemplateCascadeModule } from './templates/template-cascade.module';

@Module({
  imports: [
    TemplateCascadeModule,
    PricingModule,
    ContextTreeModule,
    ChatModule,
    LeadModule,
  ],
})
export class AppModule {}
