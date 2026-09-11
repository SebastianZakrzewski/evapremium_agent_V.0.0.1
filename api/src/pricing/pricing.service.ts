import { Inject, Injectable } from '@nestjs/common';
import {
  PRICING_CATEGORY_VARIANT_CATALOG,
  PRICING_MATRIX_CATALOG,
  PRICING_VARIANT_CATALOG,
  type PricingCategoryVariantCatalog,
  type PricingMatrixCatalog,
  type PricingVariantCatalog,
} from './ports';
import { PricingResolver } from './pricing.resolver';

@Injectable()
export class PricingService extends PricingResolver {
  constructor(
    @Inject(PRICING_VARIANT_CATALOG) variants: PricingVariantCatalog,
    @Inject(PRICING_CATEGORY_VARIANT_CATALOG)
    categoryVariants: PricingCategoryVariantCatalog,
    @Inject(PRICING_MATRIX_CATALOG) matrix: PricingMatrixCatalog,
  ) {
    super(variants, categoryVariants, matrix);
  }
}
