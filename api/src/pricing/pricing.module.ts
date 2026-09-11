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
import { PricingService } from './pricing.service';

@Module({
  providers: [
    {
      provide: PRICING_VARIANT_CATALOG,
      useFactory: () => new InMemoryPricingVariantCatalog(PRICING_VARIANTS),
    },
    {
      provide: PRICING_CATEGORY_VARIANT_CATALOG,
      useFactory: () =>
        new InMemoryPricingCategoryVariantCatalog(PRICING_CATEGORY_VARIANTS),
    },
    {
      provide: PRICING_MATRIX_CATALOG,
      useFactory: () => new InMemoryPricingMatrixCatalog(PRICING_MATRIX),
    },
    PricingService,
  ],
  exports: [PricingService],
})
export class PricingModule {}
