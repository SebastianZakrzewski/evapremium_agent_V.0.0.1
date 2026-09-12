import { Module } from '@nestjs/common';
import {
  InMemoryPricingCategoryVariantCatalog,
  InMemoryPricingMatrixCatalog,
  InMemoryPricingVariantCatalog,
} from './in-memory/in-memory-pricing-catalogs';
import {
  PRICING_CATEGORY_VARIANTS,
  PRICING_MATRIX,
  PRICING_VARIANTS,
} from './in-memory/pricing-fixture';
import {
  PRICING_CATEGORY_VARIANT_CATALOG,
  PRICING_MATRIX_CATALOG,
  PRICING_VARIANT_CATALOG,
} from './ports';
import type { DataStore } from '../supabase/data-store';
import { DATA_STORE, SupabaseModule } from '../supabase/supabase.module';
import { loadPricingLists } from './supabase/load-pricing';
import { PricingService } from './pricing.service';

const PRICING_LISTS = Symbol('PRICING_LISTS');

@Module({
  imports: [SupabaseModule],
  providers: [
    {
      provide: PRICING_LISTS,
      useFactory: async (store: DataStore | undefined) =>
        store
          ? loadPricingLists(store)
          : {
              variants: PRICING_VARIANTS,
              categoryVariants: PRICING_CATEGORY_VARIANTS,
              matrix: PRICING_MATRIX,
            },
      inject: [DATA_STORE],
    },
    {
      provide: PRICING_VARIANT_CATALOG,
      useFactory: (lists: Awaited<ReturnType<typeof loadPricingLists>>) =>
        new InMemoryPricingVariantCatalog(lists.variants),
      inject: [PRICING_LISTS],
    },
    {
      provide: PRICING_CATEGORY_VARIANT_CATALOG,
      useFactory: (lists: Awaited<ReturnType<typeof loadPricingLists>>) =>
        new InMemoryPricingCategoryVariantCatalog(lists.categoryVariants),
      inject: [PRICING_LISTS],
    },
    {
      provide: PRICING_MATRIX_CATALOG,
      useFactory: (lists: Awaited<ReturnType<typeof loadPricingLists>>) =>
        new InMemoryPricingMatrixCatalog(lists.matrix),
      inject: [PRICING_LISTS],
    },
    PricingService,
  ],
  exports: [PricingService],
})
export class PricingModule {}
