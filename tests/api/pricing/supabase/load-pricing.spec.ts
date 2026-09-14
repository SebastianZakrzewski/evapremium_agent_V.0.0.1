import { loadPricingLists } from '@api/pricing/supabase/load-pricing';
import { MemoryDataStore } from '@api/supabase/data-store';

describe('loadPricingLists', () => {
  it('joins active catalog matrix onto category slug and variant_key', async () => {
    const store = new MemoryDataStore({
      'evapremium_shop.pricing_catalog_versions': [
        { id: 'cat-old', is_active: false },
        { id: 'cat-live', is_active: true },
      ],
      'evapremium_shop.pricing_vehicle_categories': [
        { id: 'vc-car', slug: 'passenger_car' },
      ],
      'evapremium_shop.pricing_variants': [
        { id: 'var-5', variant_key: 'komplet-5szt', variant_label: 'Komplet 5 szt.' },
      ],
      'evapremium_shop.pricing_category_variants': [
        { vehicle_category_id: 'vc-car', variant_id: 'var-5', is_active: true },
      ],
      'evapremium_shop.pricing_matrix': [
        {
          catalog_version_id: 'cat-old',
          vehicle_category_id: 'vc-car',
          variant_id: 'var-5',
          mat_type: 'classic',
          base_price_pln: '1',
        },
        {
          catalog_version_id: 'cat-live',
          vehicle_category_id: 'vc-car',
          variant_id: 'var-5',
          mat_type: 'classic',
          base_price_pln: '599',
        },
      ],
    });
    await expect(loadPricingLists(store)).resolves.toEqual({
      variants: [{ variantKey: 'komplet-5szt', variantLabel: 'Komplet 5 szt.' }],
      categoryVariants: [
        { dealerPricingCategoryKey: 'passenger_car', variantKey: 'komplet-5szt' },
      ],
      matrix: [
        {
          dealerPricingCategoryKey: 'passenger_car',
          variantKey: 'komplet-5szt',
          matType: 'classic',
          amount: 599,
        },
      ],
    });
  });
});
