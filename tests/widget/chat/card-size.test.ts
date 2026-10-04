import { describe, expect, it } from 'vitest';
import { readCardSizeMessage } from '@widget/chat/card-size';

describe('readCardSizeMessage', () => {
  it('reads a positive card height from the shop frame', () => {
    expect(readCardSizeMessage({ source: 'eva-shop-card', type: 'eva.card-size', height: 480.2 })).toBe(481);
  });

  it('ignores messages that are not a card size', () => {
    expect(readCardSizeMessage({ source: 'eva-shop-card', type: 'other', height: 400 })).toBeNull();
    expect(readCardSizeMessage({ source: 'other', type: 'eva.card-size', height: 400 })).toBeNull();
    expect(readCardSizeMessage({ source: 'eva-shop-card', type: 'eva.card-size', height: 0 })).toBeNull();
    expect(readCardSizeMessage(null)).toBeNull();
  });
});
