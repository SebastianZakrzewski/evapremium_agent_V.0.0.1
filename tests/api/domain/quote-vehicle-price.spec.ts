import {
  PRICING_CATEGORY_VARIANTS,
  PRICING_MATRIX,
  PRICING_VARIANTS,
} from '@api/pricing/in-memory/pricing-fixture';
import { listCategoryVariants, listMatTypes, quotePrice } from '@api/domain/pricing';
import {
  composeQuoteVehicle,
  type QuoteVehiclePriceInput,
} from '@api/domain/quote-vehicle-price';
import {
  CASCADE_ALIASES,
  CASCADE_TEMPLATES,
} from '@api/templates/in-memory/cascade-fixture';
import {
  resolveTemplate,
  type MatTemplate,
} from '@api/domain/template-cascade';

const PASSENGER_OPTIONS = [
  { variantKey: 'komplet-5szt', variantLabel: 'Komplet 5 szt.' },
  { variantKey: 'kierowca', variantLabel: 'Kierowca' },
];

function template(category: string): MatTemplate {
  return {
    id: `tmpl-${category}`,
    recordKey: category,
    brandKey: 'Audi',
    modelKey: 'A4',
    dealerPricingCategoryKey: category,
    isActive: true,
    yearFrom: 2015,
    yearTo: 2023,
    isOpenEnded: false,
    bodyTypeKey: 'sedan',
    bodyType1Key: 'sedan',
    bodyType2Key: null,
    bodyType3Key: null,
  };
}

function compose(
  input: QuoteVehiclePriceInput,
  templates: MatTemplate[] = CASCADE_TEMPLATES,
) {
  return composeQuoteVehicle(input, {
    resolveTemplate: (slots) => resolveTemplate(slots, templates, CASCADE_ALIASES),
    listCategoryVariants: (key) =>
      listCategoryVariants(key, PRICING_CATEGORY_VARIANTS, PRICING_VARIANTS),
    quotePrice: (quote) => quotePrice(quote, PRICING_CATEGORY_VARIANTS, PRICING_MATRIX),
    matTypes: (category, variantKey) =>
      listMatTypes(category, variantKey, PRICING_MATRIX),
  });
}

describe('quote vehicle price', () => {
  it('quotes one amount when cascade is one and the variant is on the category', () => {
    expect(
      compose({
        brand: 'vw',
        model: 'golf 8',
        bodyType: 'hatchback',
        variantKey: 'komplet-5szt',
      }),
    ).toEqual({ status: 'quoted', amount: 599, currency: 'PLN' });
  });

  it('asks for a category variant and does not quote when variantKey is missing', () => {
    const result = compose({
      brand: 'audi',
      model: 'a4',
      year: 2020,
    });

    expect(result).toEqual({
      status: 'need_variant',
      options: PASSENGER_OPTIONS,
    });
    expect(result).not.toHaveProperty('amount');
  });

  it('treats a blank variantKey as missing', () => {
    expect(
      compose({
        brand: 'audi',
        model: 'a4',
        variantKey: '  ',
      }),
    ).toEqual({
      status: 'need_variant',
      options: PASSENGER_OPTIONS,
    });
  });

  it('returns many without a price when brand and model match several templates', () => {
    const result = compose({ brand: 'vw', model: 'golf 8' });

    expect(result).toEqual({ status: 'many' });
    expect(result).not.toHaveProperty('amount');
  });

  it('returns none without a price when the slots do not map to a template', () => {
    const result = compose({ brand: 'fiat', model: 'panda' });

    expect(result).toEqual({ status: 'none' });
    expect(result).not.toHaveProperty('amount');
  });

  it('returns need_variant without a price when the variant is off the category', () => {
    const result = compose({
      brand: 'audi',
      model: 'a4',
      variantKey: 'nie-na-kategorii',
    });

    expect(result).toEqual({
      status: 'need_variant',
      options: PASSENGER_OPTIONS,
    });
    expect(result).not.toHaveProperty('amount');
  });

  it('asks for mat type when the matrix has more than one row', () => {
    const result = compose(
      {
        brand: 'audi',
        model: 'a4',
        variantKey: 'komplet-5szt',
      },
      [template('pickup')],
    );

    expect(result).toEqual({
      status: 'mat_type_required',
      matTypes: ['classic', '3d-with-rims'],
    });
    expect(result).not.toHaveProperty('amount');
  });

  it('quotes the chosen mat type after mat_type_required', () => {
    expect(
      compose(
        {
          brand: 'audi',
          model: 'a4',
          variantKey: 'komplet-5szt',
          matType: '3d-with-rims',
        },
        [template('pickup')],
      ),
    ).toEqual({ status: 'quoted', amount: 1099, currency: 'PLN' });
  });

  it('returns missing_matrix_row without a price when the category has no matrix row', () => {
    const result = compose(
      {
        brand: 'audi',
        model: 'a4',
        variantKey: 'komplet-5szt',
      },
      [template('minivan')],
    );

    expect(result).toEqual({ status: 'missing_matrix_row' });
    expect(result).not.toHaveProperty('amount');
  });
});
