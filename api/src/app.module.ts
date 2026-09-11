import { Module } from '@nestjs/common';
import { ContextTreeModule } from './context-tree/context-tree.module';
import { PricingModule } from './pricing/pricing.module';
import { TemplateCascadeModule } from './templates/template-cascade.module';

@Module({
  imports: [TemplateCascadeModule, PricingModule, ContextTreeModule],
})
export class AppModule {}
