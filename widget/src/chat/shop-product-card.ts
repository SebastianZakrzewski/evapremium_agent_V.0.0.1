import { parseWidgetConfig } from '../embed/widget-config';

export type VerifiedShopProduct = {
  productId: string;
  fields: Record<string, string>;
};

function fillCardTokens(cardUrl: string, fields: Record<string, string>): string {
  return cardUrl.replace(/\{([^{}]+)\}/g, (token, key: string) => {
    const value = fields[key]?.trim() ?? '';
    if (value === '') {
      return token;
    }
    return encodeURIComponent(value);
  });
}

/**
 * Shop window for a verified product. `{productId}` and every `{key}` in
 * `fields` are replaced. The widget does not name those keys. A leftover
 * token does not open a window.
 */
export function shopProductCardSrc(
  cardUrl: string,
  product: VerifiedShopProduct,
): string | null {
  const productId = product.productId.trim();
  if (productId === '') {
    return null;
  }
  const filled = fillCardTokens(cardUrl, { ...(product.fields ?? {}), productId });
  if (/\{[^{}]+\}/.test(filled)) {
    return null;
  }
  const parsed = parseWidgetConfig({
    showProduct: { productId, cardUrl: filled },
  });
  return parsed?.showProduct?.cardUrl ?? null;
}

export function shopCardUrlFromSearch(search: string): string {
  return new URLSearchParams(search).get('cardUrl') ?? '';
}
