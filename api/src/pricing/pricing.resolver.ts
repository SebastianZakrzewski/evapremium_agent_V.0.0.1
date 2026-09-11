import {
  listCategoryVariants,
  quotePrice,
  type CategoryVariantOption,
  type QuotePriceInput,
  type QuotePriceResult,
} from '../domain/pricing';
import type {
  PricingCategoryVariantCatalog,
  PricingMatrixCatalog,
  PricingVariantCatalog,
} from './ports';

export class PricingResolver {
  constructor(
    private readonly variants: PricingVariantCatalog,
    private readonly categoryVariants: PricingCategoryVariantCatalog,
    private readonly matrix: PricingMatrixCatalog,
  ) {}

  listCategoryVariants(dealerPricingCategoryKey: string): CategoryVariantOption[] {
    return listCategoryVariants(
      dealerPricingCategoryKey,
      this.categoryVariants.list(),
      this.variants.list(),
    );
  }

  quote(input: QuotePriceInput): QuotePriceResult {
    return quotePrice(input, this.categoryVariants.list(), this.matrix.list());
  }
}
