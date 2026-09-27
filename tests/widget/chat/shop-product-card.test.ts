import { describe, expect, it } from 'vitest';
import { shopProductCardSrc } from '@widget/chat/shop-product-card';

describe('shop product card', () => {
  it('opens the shop dywaniki window for the verified brand slug', () => {
    const bmw = shopProductCardSrc('https://shop.example/dywaniki?brand={brand}', {
      productId: 'bmw-x5',
      brand: 'BMW',
      model: 'X5',
    });
    const audi = shopProductCardSrc('https://shop.example/dywaniki?brand={brand}', {
      productId: 'audi-a4',
      brand: 'Audi',
      model: 'A4',
    });
    expect(bmw).toBe('https://shop.example/dywaniki?brand=bmw');
    expect(audi).toBe('https://shop.example/dywaniki?brand=audi');
  });

  it('adds the brand query when the shop address has no brand token', () => {
    expect(
      shopProductCardSrc('https://shop.example/dywaniki', {
        productId: 'bmw-x5',
        brand: 'BMW',
        model: 'X5',
      }),
    ).toBe('https://shop.example/dywaniki?brand=bmw');
  });

  it('does not open a window without a brand and model', () => {
    expect(
      shopProductCardSrc('https://shop.example/dywaniki?brand={brand}', {
        productId: 'bmw-x5',
        brand: ' ',
        model: 'X5',
      }),
    ).toBeNull();
    expect(
      shopProductCardSrc('http://shop.example/dywaniki?brand={brand}', {
        productId: 'bmw-x5',
        brand: 'BMW',
        model: 'X5',
      }),
    ).toBeNull();
  });
});
