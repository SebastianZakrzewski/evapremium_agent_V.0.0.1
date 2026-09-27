import { parseWidgetConfig } from '../embed/widget-config';

export type VerifiedShopProduct = {
  productId: string;
  brand: string;
  model: string;
};

function brandSlug(brand: string): string {
  return brand
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function fillCardToken(cardUrl: string, token: string, value: string): string {
  return cardUrl.split(token).join(encodeURIComponent(value));
}

/**
 * Shop window for a verified brand. The shop page is `/dywaniki?brand={slug}`
 * and renders CarModelsSection. Model cards are articles inside that section.
 */
export function shopProductCardSrc(
  cardUrl: string,
  product: VerifiedShopProduct,
): string | null {
  const brand = brandSlug(product.brand);
  const model = product.model.trim();
  if (brand === '' || model === '') {
    return null;
  }
  const filled = fillCardToken(
    fillCardToken(cardUrl, '{productId}', product.productId),
    '{brand}',
    brand,
  );
  const parsed = parseWidgetConfig({
    showProduct: { productId: product.productId, cardUrl: filled },
  });
  if (!parsed?.showProduct) {
    return null;
  }
  const url = new URL(parsed.showProduct.cardUrl);
  if (!cardUrl.includes('{brand}')) {
    url.searchParams.set('brand', brand);
  }
  return url.toString();
}

export function shopCardUrlFromSearch(search: string): string {
  return new URLSearchParams(search).get('cardUrl') ?? '';
}
