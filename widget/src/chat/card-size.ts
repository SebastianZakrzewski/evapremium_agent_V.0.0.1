export const EVA_CARD_SIZE_SOURCE = 'eva-shop-card';
export const EVA_CARD_SIZE_TYPE = 'eva.card-size';

export function readCardSizeMessage(value: unknown): number | null {
  if (value === null || typeof value !== 'object') {
    return null;
  }
  const message = value as { source?: unknown; type?: unknown; height?: unknown };
  if (message.source !== EVA_CARD_SIZE_SOURCE || message.type !== EVA_CARD_SIZE_TYPE) {
    return null;
  }
  if (typeof message.height !== 'number' || !Number.isFinite(message.height) || message.height < 1) {
    return null;
  }
  return Math.ceil(message.height);
}
