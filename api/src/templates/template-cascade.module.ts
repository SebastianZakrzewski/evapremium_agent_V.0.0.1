import { Module } from '@nestjs/common';
import {
  CASCADE_ALIASES,
  CASCADE_TEMPLATES,
} from './in-memory/cascade-fixture';
import {
  InMemoryAliasCatalog,
  InMemoryTemplateCatalog,
} from './in-memory/in-memory-catalogs';
import { ALIAS_CATALOG, TEMPLATE_CATALOG } from './ports';
import { TemplateCascadeService } from './template-cascade.service';

@Module({
  providers: [
    {
      provide: TEMPLATE_CATALOG,
      useFactory: () => new InMemoryTemplateCatalog(CASCADE_TEMPLATES),
    },
    {
      provide: ALIAS_CATALOG,
      useFactory: () => new InMemoryAliasCatalog(CASCADE_ALIASES),
    },
    TemplateCascadeService,
  ],
  exports: [TemplateCascadeService],
})
export class TemplateCascadeModule {}
