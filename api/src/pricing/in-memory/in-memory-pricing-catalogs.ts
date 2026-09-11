import type {
  PricingCategoryVariant,
  PricingMatrixRow,
  PricingVariant,
} from '../../domain/pricing';
import type {
  PricingCategoryVariantCatalog,
  PricingMatrixCatalog,
  PricingVariantCatalog,
} from '../ports';

export class InMemoryPricingVariantCatalog implements PricingVariantCatalog {
  constructor(private readonly rows: PricingVariant[]) {}

  list(): PricingVariant[] {
    return this.rows;
  }
}

export class InMemoryPricingCategoryVariantCatalog
  implements PricingCategoryVariantCatalog
{
  constructor(private readonly rows: PricingCategoryVariant[]) {}

  list(): PricingCategoryVariant[] {
    return this.rows;
  }
}

export class InMemoryPricingMatrixCatalog implements PricingMatrixCatalog {
  constructor(private readonly rows: PricingMatrixRow[]) {}

  list(): PricingMatrixRow[] {
    return this.rows;
  }
}
