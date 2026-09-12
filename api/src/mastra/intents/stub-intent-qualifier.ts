import type { IntentQualifier } from './intent-qualifier';
import type { QualifyResult, ShopIntent } from './schema';

function matchIntent(message: string): ShopIntent {
  const text = message.toLowerCase();
  if (/ile koszt|wycen|\bcen/.test(text)) {
    return 'pricing';
  }
  if (/dostaw|termin/.test(text)) {
    return 'delivery';
  }
  if (/gwaranc|piel[eę]gn|monta[zż]/.test(text)) {
    return 'after_sales';
  }
  if (/dywan|golf|materiał|dopasow/.test(text)) {
    return 'product_info';
  }
  return 'out_of_scope';
}

export class StubIntentQualifier implements IntentQualifier {
  qualify(message: string): Promise<QualifyResult> {
    return Promise.resolve({
      intent: matchIntent(message),
      confidence: 1,
    });
  }
}
