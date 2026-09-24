import type {
  RouterEntities,
  SubIntentSlug,
  TurnMode,
} from '../../domain/sub-intent-catalog';
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
  if (/gwaranc|piel[eę]gn|czyśc|monta[zż]|reklamac/.test(text)) {
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

function extractEntities(message: string): RouterEntities {
  const entities: RouterEntities = {};
  const brand = message.match(
    /\b(volkswagen|vw|bmw|audi|toyota|skoda|škoda)\b/iu,
  );
  if (brand?.[1] !== undefined) {
    entities.car_brand = brand[1];
  }
  const model = message.match(/\bgolf(?:a|em|owi)?(?:\s+(\d+))?/iu);
  if (model !== null) {
    entities.car_model = model[1] !== undefined ? `Golf ${model[1]}` : 'Golf';
  }
  return entities;
}

function matchSubIntent(
  intent: ShopIntent,
  message: string,
): SubIntentSlug | null {
  const text = message.toLowerCase();
  if (intent === 'pricing') {
    return 'indicative_quote';
  }
  if (intent === 'delivery') {
    return 'delivery_info';
  }
  if (intent === 'after_sales') {
    return /reklamac/.test(text) ? 'complaint_info' : null;
  }
  if (intent === 'product_info') {
    if (/kolor/.test(text)) {
      return 'available_colors';
    }
    if (/materia[lł]/.test(text)) {
      return 'material';
    }
    if (/dopasow|pasuj|pasowa/.test(text)) {
      return 'fitment';
    }
  }
  return null;
}

function matchMode(
  intent: ShopIntent,
  subIntent: SubIntentSlug | null,
  message: string,
): TurnMode {
  const text = message.toLowerCase();
  if (intent === 'out_of_scope') {
    return 'ambiguous';
  }
  if (intent === 'pricing') {
    if (/jak\s+(się\s+|sie\s+)?licz|skąd cena|skad cena|co wpływa/.test(text)) {
      return 'knowledge';
    }
    return 'action';
  }
  if (
    subIntent === 'fitment' &&
    /dobierz|dobrać|dobrac|chcę dopas|chce dopas/.test(text)
  ) {
    return 'action';
  }
  return 'knowledge';
}

export class StubIntentQualifier implements IntentQualifier {
  qualify(message: string): Promise<QualifyResult> {
    const intent = matchIntent(message);
    const sub_intent = matchSubIntent(intent, message);
    return Promise.resolve({
      intent,
      sub_intent,
      mode: matchMode(intent, sub_intent, message),
      entities: extractEntities(message),
      confidence: 1,
    });
  }
}
