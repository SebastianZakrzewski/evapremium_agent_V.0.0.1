import type {
  PricingCategoryVariant,
  PricingMatrixRow,
  PricingVariant,
} from '../domain/pricing';

export const PRICING_VARIANT_CATALOG = Symbol('PRICING_VARIANT_CATALOG');
export const PRICING_CATEGORY_VARIANT_CATALOG = Symbol(
  'PRICING_CATEGORY_VARIANT_CATALOG',
);
export const PRICING_MATRIX_CATALOG = Symbol('PRICING_MATRIX_CATALOG');

export interface PricingVariantCatalog {
  list(): PricingVariant[];
}

export interface PricingCategoryVariantCatalog {
  list(): PricingCategoryVariant[];
}

export interface PricingMatrixCatalog {
  list(): PricingMatrixRow[];
}
