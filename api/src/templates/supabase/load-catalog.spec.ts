import { loadMatTemplates } from './load-catalog';
import { MemoryDataStore } from '../../supabase/data-store';

describe('loadMatTemplates', () => {
  it('maps shop columns onto the cascade contract', async () => {
    const store = new MemoryDataStore({
      'evapremium_shop.mat_templates': [
        {
          id: 'tmpl-1',
          record_key: 'passenger_car|volkswagen|golf|2019-|hatchback',
          brand_key: 'Volkswagen',
          model_key: 'Golf(MK8) 8 gen',
          dealer_pricing_category_key: 'passenger_car',
          is_active: true,
          year_from: 2019,
          year_to: null,
          is_open_ended: true,
          body_type_key: 'hatchback',
          body_type_1_key: 'hatchback',
          body_type_2_key: null,
          body_type_3_key: null,
        },
      ],
    });
    await expect(loadMatTemplates(store)).resolves.toEqual([
      {
        id: 'tmpl-1',
        recordKey: 'passenger_car|volkswagen|golf|2019-|hatchback',
        brandKey: 'Volkswagen',
        modelKey: 'Golf(MK8) 8 gen',
        dealerPricingCategoryKey: 'passenger_car',
        isActive: true,
        yearFrom: 2019,
        yearTo: null,
        isOpenEnded: true,
        bodyTypeKey: 'hatchback',
        bodyType1Key: 'hatchback',
        bodyType2Key: null,
        bodyType3Key: null,
      },
    ]);
  });
});
