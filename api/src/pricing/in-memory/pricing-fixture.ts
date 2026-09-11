import type {
  PricingCategoryVariant,
  PricingMatrixRow,
  PricingVariant,
} from '../../domain/pricing';

export const PRICING_VARIANTS: PricingVariant[] = [
  { variantKey: 'komplet-5szt', variantLabel: 'Komplet 5 szt.' },
  { variantKey: 'kierowca', variantLabel: 'Kierowca' },
  { variantKey: 'nie-na-kategorii', variantLabel: 'Wariant spoza kategorii' },
];

export const PRICING_CATEGORY_VARIANTS: PricingCategoryVariant[] = [
  { dealerPricingCategoryKey: 'passenger_car', variantKey: 'komplet-5szt' },
  { dealerPricingCategoryKey: 'passenger_car', variantKey: 'kierowca' },
  { dealerPricingCategoryKey: 'minivan', variantKey: 'komplet-5szt' },
  { dealerPricingCategoryKey: 'pickup', variantKey: 'komplet-5szt' },
];

export const PRICING_MATRIX: PricingMatrixRow[] = [
  {
    dealerPricingCategoryKey: 'passenger_car',
    variantKey: 'komplet-5szt',
    matType: 'classic',
    amount: 599,
  },
  {
    dealerPricingCategoryKey: 'passenger_car',
    variantKey: 'kierowca',
    matType: 'classic',
    amount: 199,
  },
  {
    dealerPricingCategoryKey: 'pickup',
    variantKey: 'komplet-5szt',
    matType: 'classic',
    amount: 899,
  },
  {
    dealerPricingCategoryKey: 'pickup',
    variantKey: 'komplet-5szt',
    matType: '3d-with-rims',
    amount: 1099,
  },
];
