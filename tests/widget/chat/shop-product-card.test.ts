import { describe, expect, it } from 'vitest';
import { shopProductCardSrc } from '@widget/chat/shop-product-card';

const rav4 = {
  productId: 'passenger_car|toyota|rav4_xa50_5_gen|2019-2026|suv|2554',
  fields: {
    brand_key: 'Toyota',
    model_key: 'Rav4 (XA50) 5 gen',
    model_family_key: 'Rav4 (XA50) 5 gen',
    generation: '2019-2026',
    body_type_key: 'suv',
  },
};

describe('shop product card', () => {
  it('fills the tokens the shop put in the card address', () => {
    expect(
      shopProductCardSrc(
        'https://www.evapremium.pl/modele?brand={brand_key}&model={model_family_key}&generation={generation}&bodyType={body_type_key}',
        rav4,
      ),
    ).toBe(
      'https://www.evapremium.pl/modele?brand=Toyota&model=Rav4%20(XA50)%205%20gen&generation=2019-2026&bodyType=suv',
    );
  });

  it('fills the product id when that is the only token', () => {
    expect(
      shopProductCardSrc('https://shop.example/modele?record={productId}', {
        productId: rav4.productId,
        fields: {},
      }),
    ).toBe(
      'https://shop.example/modele?record=passenger_car%7Ctoyota%7Crav4_xa50_5_gen%7C2019-2026%7Csuv%7C2554',
    );
  });

  it('does not open a window while a shop token is still empty', () => {
    expect(
      shopProductCardSrc(
        'https://shop.example/modele?brand={brand_key}&generation={generation}',
        {
          productId: rav4.productId,
          fields: { brand_key: 'Toyota' },
        },
      ),
    ).toBeNull();
    expect(
      shopProductCardSrc('http://shop.example/modele?record={productId}', {
        productId: rav4.productId,
        fields: {},
      }),
    ).toBeNull();
  });
});
