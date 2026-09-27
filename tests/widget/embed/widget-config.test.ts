import { describe, expect, it } from 'vitest';
import { parseWidgetConfig } from '@widget/embed/widget-config';

describe('widget config', () => {
  it('reads showProduct as a field of the widget object', () => {
    expect(
      parseWidgetConfig({
        showProduct: {
          productId: ' audi-a4 ',
          cardUrl: 'https://shop.example/cards/audi-a4',
        },
      }),
    ).toEqual({
      showProduct: {
        productId: 'audi-a4',
        cardUrl: 'https://shop.example/cards/audi-a4',
      },
    });
  });

  it('accepts a widget object without a product card', () => {
    expect(parseWidgetConfig({})).toEqual({});
  });

  it('rejects a showProduct field that is not a shop card address', () => {
    expect(
      parseWidgetConfig({
        showProduct: { productId: '  ', cardUrl: 'https://shop.example/cards/audi-a4' },
      }),
    ).toBeNull();
    expect(
      parseWidgetConfig({
        showProduct: { productId: 'audi-a4', cardUrl: 'http://shop.example/cards/audi-a4' },
      }),
    ).toBeNull();
    expect(
      parseWidgetConfig({
        showProduct: { productId: 'audi-a4', cardUrl: '/cards/audi-a4' },
      }),
    ).toBeNull();
  });
});
