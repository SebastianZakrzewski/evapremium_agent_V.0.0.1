import { Module } from '@nestjs/common';
import { PricingModule } from './pricing/pricing.module';
import { TemplateCascadeModule } from './templates/template-cascade.module';

@Module({
  imports: [TemplateCascadeModule, PricingModule],
})
export class AppModule {}
