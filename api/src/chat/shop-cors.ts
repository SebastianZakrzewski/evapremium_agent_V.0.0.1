export const SHOP_CORS_ORIGINS = [
  'https://evapremium.pl',
  'https://www.evapremium.pl',
] as const;

export type ShopCorsOrigin = (typeof SHOP_CORS_ORIGINS)[number];

export function chatCorsOrigins(widgetOrigin?: string): string[] {
  const origins: string[] = [...SHOP_CORS_ORIGINS];
  const extra = widgetOrigin?.trim().replace(/\/$/, '');
  if (
    extra &&
    extra.startsWith('https://') &&
    !origins.includes(extra)
  ) {
    origins.push(extra);
  }
  return origins;
}
