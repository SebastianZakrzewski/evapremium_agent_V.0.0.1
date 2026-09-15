import type { IntentQualifier } from './intent-qualifier';
import type { QualifyResult, ShopIntent } from './schema';

function matchIntent(message: string): ShopIntent {
  const text = message.toLowerCase();
  if (/ile koszt|wycen|\bcen/.test(text)) {
    return 'pricing';
  }
  if (/dostaw|termin|wyślecie|wyslecie/.test(text)) {
    return 'delivery';
  }
  if (/gwaranc|piel[eę]gn|czyśc|monta[zż]/.test(text)) {
    return 'after_sales';
  }
  if (
    /dywan|golf|materiał|kolor|dopasow|dobrać|dobrac|dzień dobry|dzien dobry|cześć|czesc|\bhej\b|\bwitam\b/.test(
      text,
    )
  ) {
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
