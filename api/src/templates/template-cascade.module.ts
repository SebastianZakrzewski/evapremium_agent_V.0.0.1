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
import type { DataStore } from '../supabase/data-store';
import { DATA_STORE, SupabaseModule } from '../supabase/supabase.module';
import { loadMatTemplates, loadVehicleSlotAliases } from './supabase/load-catalog';
import { TemplateCascadeService } from './template-cascade.service';

@Module({
  imports: [SupabaseModule],
  providers: [
    {
      provide: TEMPLATE_CATALOG,
      useFactory: async (store: DataStore | undefined) =>
        new InMemoryTemplateCatalog(
          store ? await loadMatTemplates(store) : CASCADE_TEMPLATES,
        ),
      inject: [DATA_STORE],
    },
    {
      provide: ALIAS_CATALOG,
      useFactory: async (store: DataStore | undefined) =>
        new InMemoryAliasCatalog(
          store ? await loadVehicleSlotAliases(store) : CASCADE_ALIASES,
        ),
      inject: [DATA_STORE],
    },
    TemplateCascadeService,
  ],
  exports: [TemplateCascadeService],
})
export class TemplateCascadeModule {}
