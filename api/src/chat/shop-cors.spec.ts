import { chatCorsOrigins, SHOP_CORS_ORIGINS } from './shop-cors';

describe('chatCorsOrigins', () => {
  it('keeps shop origins and appends https widget origin', () => {
    expect(chatCorsOrigins()).toEqual([...SHOP_CORS_ORIGINS]);
    expect(chatCorsOrigins('https://evabot.vercel.app/')).toEqual([
      'https://evapremium.pl',
      'https://www.evapremium.pl',
      'https://evabot.vercel.app',
    ]);
  });

  it('ignores http widget origins', () => {
    expect(chatCorsOrigins('http://46.224.75.64:3000')).toEqual([
      ...SHOP_CORS_ORIGINS,
    ]);
  });
});
