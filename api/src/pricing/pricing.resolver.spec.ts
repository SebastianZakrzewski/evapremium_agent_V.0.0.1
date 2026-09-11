import {
  PRICING_CATEGORY_VARIANTS,
  PRICING_MATRIX,
  PRICING_VARIANTS,
} from './in-memory/pricing-fixture';
import {
  InMemoryPricingCategoryVariantCatalog,
  InMemoryPricingMatrixCatalog,
  InMemoryPricingVariantCatalog,
} from './in-memory/in-memory-pricing-catalogs';
import { PricingResolver } from './pricing.resolver';

describe('PricingResolver', () => {
  const resolver = new PricingResolver(
    new InMemoryPricingVariantCatalog(PRICING_VARIANTS),
    new InMemoryPricingCategoryVariantCatalog(PRICING_CATEGORY_VARIANTS),
    new InMemoryPricingMatrixCatalog(PRICING_MATRIX),
  );

  it('quotes a known category variant through in-memory catalogs', () => {
    expect(
      resolver.quote({
        dealerPricingCategoryKey: 'passenger_car',
        variantKey: 'komplet-5szt',
      }),
    ).toEqual({ status: 'quoted', amount: 599, currency: 'PLN' });
  });

  it('lists category variants and domain errors from the same catalogs', () => {
    expect(resolver.listCategoryVariants('passenger_car')).toEqual([
      { variantKey: 'komplet-5szt', variantLabel: 'Komplet 5 szt.' },
      { variantKey: 'kierowca', variantLabel: 'Kierowca' },
    ]);
    expect(
      resolver.quote({
        dealerPricingCategoryKey: 'passenger_car',
        variantKey: 'nie-na-kategorii',
      }),
    ).toEqual({ status: 'unknown_variant' });
  });
});
