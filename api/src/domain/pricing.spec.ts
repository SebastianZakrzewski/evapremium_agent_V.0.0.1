import {
  PRICING_CATEGORY_VARIANTS,
  PRICING_MATRIX,
  PRICING_VARIANTS,
} from '../pricing/in-memory/pricing-fixture';
import { listCategoryVariants, quotePrice } from './pricing';

describe('pricing', () => {
  it('lists only variants attached to the template category', () => {
    expect(
      listCategoryVariants(
        'passenger_car',
        PRICING_CATEGORY_VARIANTS,
        PRICING_VARIANTS,
      ),
    ).toEqual([
      { variantKey: 'komplet-5szt', variantLabel: 'Komplet 5 szt.' },
      { variantKey: 'kierowca', variantLabel: 'Kierowca' },
    ]);
  });

  it('quotes one amount from the matrix for a known category and variant', () => {
    expect(
      quotePrice(
        {
          dealerPricingCategoryKey: 'passenger_car',
          variantKey: 'komplet-5szt',
        },
        PRICING_CATEGORY_VARIANTS,
        PRICING_MATRIX,
      ),
    ).toEqual({ status: 'quoted', amount: 599, currency: 'PLN' });
  });

  it('quotes when dual mat types are resolved with mat_type', () => {
    expect(
      quotePrice(
        {
          dealerPricingCategoryKey: 'pickup',
          variantKey: 'komplet-5szt',
          matType: '3d-with-rims',
        },
        PRICING_CATEGORY_VARIANTS,
        PRICING_MATRIX,
      ),
    ).toEqual({ status: 'quoted', amount: 1099, currency: 'PLN' });
  });

  it('returns a domain error when mat_type is required and missing', () => {
    const result = quotePrice(
      {
        dealerPricingCategoryKey: 'pickup',
        variantKey: 'komplet-5szt',
      },
      PRICING_CATEGORY_VARIANTS,
      PRICING_MATRIX,
    );

    expect(result).toEqual({ status: 'mat_type_required' });
    expect(result).not.toHaveProperty('amount');
  });

  it('returns a domain error when the variant is not on the category', () => {
    const result = quotePrice(
      {
        dealerPricingCategoryKey: 'passenger_car',
        variantKey: 'nie-na-kategorii',
      },
      PRICING_CATEGORY_VARIANTS,
      PRICING_MATRIX,
    );

    expect(result).toEqual({ status: 'unknown_variant' });
    expect(result).not.toHaveProperty('amount');
  });

  it('returns a domain error when the category has the variant but the matrix has no row', () => {
    const result = quotePrice(
      {
        dealerPricingCategoryKey: 'minivan',
        variantKey: 'komplet-5szt',
      },
      PRICING_CATEGORY_VARIANTS,
      PRICING_MATRIX,
    );

    expect(result).toEqual({ status: 'missing_matrix_row' });
    expect(result).not.toHaveProperty('amount');
  });
});
