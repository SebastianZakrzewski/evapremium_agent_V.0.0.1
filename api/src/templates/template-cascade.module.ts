import { Module, type DynamicModule } from '@nestjs/common';
import type { VehicleKeyClassifier } from '../domain/template-cascade';
import type { DataStore } from '../supabase/data-store';
import { DATA_STORE, SupabaseModule } from '../supabase/supabase.module';
import {
  CASCADE_ALIASES,
  CASCADE_TEMPLATES,
} from './in-memory/cascade-fixture';
import {
  InMemoryAliasCatalog,
  InMemoryTemplateCatalog,
} from './in-memory/in-memory-catalogs';
import { ALIAS_CATALOG, TEMPLATE_CATALOG, VEHICLE_KEY_CLASSIFIER } from './ports';
import { loadMatTemplates, loadVehicleSlotAliases } from './supabase/load-catalog';
import { TemplateCascadeService } from './template-cascade.service';

/**
 * Katalog szablonów i aliasów. Klasyfikator kluczy dostaje gotowy port
 * z `ChatModule` — ten moduł nie składa agenta Mastry.
 */
@Module({})
export class TemplateCascadeModule {
  static register(classifier: VehicleKeyClassifier | null): DynamicModule {
    return {
      module: TemplateCascadeModule,
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
        {
          provide: VEHICLE_KEY_CLASSIFIER,
          useFactory: () => classifier,
        },
        TemplateCascadeService,
      ],
      exports: [TemplateCascadeService],
    };
  }
}
