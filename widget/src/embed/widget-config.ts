/**
 * Shop-facing widget object. It is the configuration interface.
 * `showProduct` is one field: the shop's own card, addressed by id and HTTPS URL.
 */
export type ShowProductConfig = {
  productId: string;
  cardUrl: string;
};

export type WidgetConfig = {
  showProduct?: ShowProductConfig;
};

function readShowProduct(config: ShowProductConfig): ShowProductConfig | null {
  const productId = config.productId.trim();
  if (productId === '') {
    return null;
  }
  let cardUrl: URL;
  try {
    cardUrl = new URL(config.cardUrl.trim());
  } catch {
    return null;
  }
  if (cardUrl.protocol !== 'https:') {
    return null;
  }
  return { productId, cardUrl: cardUrl.toString() };
}

export function parseWidgetConfig(config: WidgetConfig): WidgetConfig | null {
  if (config.showProduct === undefined) {
    return {};
  }
  const showProduct = readShowProduct(config.showProduct);
  if (!showProduct) {
    return null;
  }
  return { showProduct };
}
