import { Module } from '@nestjs/common';
import { TemplateCascadeModule } from './templates/template-cascade.module';

@Module({
  imports: [TemplateCascadeModule],
})
export class AppModule {}
