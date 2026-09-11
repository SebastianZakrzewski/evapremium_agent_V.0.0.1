export const SHOP_CORS_ORIGINS = [
  'https://evapremium.pl',
  'https://www.evapremium.pl',
] as const;

export type ShopCorsOrigin = (typeof SHOP_CORS_ORIGINS)[number];
