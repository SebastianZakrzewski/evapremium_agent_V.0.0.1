import type {
  IntentExecution,
  IntentFallback,
  IntentPermissions,
  IntentProfile,
  IntentRouting,
} from './intent-profile';
import type { ShopIntent, ShopToolId } from './schema';

const shopForbidden = [
  'checkout',
  'payment',
  'place_order',
  'account_login',
] as const;

const defaultExecution: IntentExecution = {
  mode: 'agent_loop',
  maxToolCalls: 8,
};

const faqExecution: IntentExecution = {
  mode: 'agent_loop',
  maxToolCalls: 4,
};

const FAQ_TURN_PROCEDURE =
  'Gdy lookup-leaf zwraca hit i body, fakt sklepu bierz tylko stamtąd. Nie zmyślaj polityki. search-leaves najwyżej raz w turze; query = pytanie klienta. lookup-leaf tylko ze slugów z tego wyniku. Gdy confidence=high: jeden lookup (pierwszy slug). Gdy confidence=ambiguous: nie bierz #1 w ciemno — wybierz slug, którego body odpowiada na pytanie, albo drugi lookup. Nie wymyślaj sluga. Po 1 hicie, którego body odpowiada na pytanie: odpowiedz po polsku i nie wołaj więcej tooli. Drugi lookup tylko gdy pierwszy body nie pokrywa pytania. Nie uśredniaj sprzecznych liści. Pusty search albo sam miss: nie wymyślaj terminu, ceny, gwarancji ani zasad dostawy. Nie mów klientowi o drzewie kontekstu, liściach, slugach, narzędziach, statusie miss ani o braku zapisanego faktu. Odpowiedz krótko po polsku i zaproponuj dopasowanie dywaników albo wycenę. Bez drugiego search. Bez obietnicy kontaktu bez leada Nest.';

const defaultFallback: IntentFallback = {
  onLowConfidence: 'reclassify',
  onToolFailure: 'retry',
  onUnknownCase: 'out_of_scope',
};

function shopPermissions(
  allowedActions: string[],
): IntentPermissions {
  return {
    allowedActions,
    forbiddenActions: [...shopForbidden],
  };
}

export class ProductInfoIntentProfile implements IntentProfile {
  readonly id = 'product_info' as const;
  readonly context =
    'Q&A o ofercie EvaPremium: dopasowanie dywaników EVA pod model auta, komplet, materiał, wymiary, karta produktu.';
  readonly instructions =
    `${FAQ_TURN_PROCEDURE} Samo powitanie (cześć, hej, dzień dobry) bez pytania o fakt: przywitaj się krótko i zaproś do wyboru tematu albo auta; bez search-leaves i lookup-leaf. Z listy search preferuj (tylko jeśli tam są): material-eva, kolory, wlasciwosci, trwalosc-dywanikow, parametry, 3d-bez-rantow, 3d-z-rantami. resolve-template tylko gdy nota wykonania każe go wywołać. Gdy nota podaje wynik kaskady, odpowiedz z niej. Nie zgaduj VIN. Bez kwoty.`;
  readonly tools: ShopToolId[] = [
    'resolve-template',
    'lookup-leaf',
    'search-leaves',
  ];
  readonly execution = defaultExecution;
  readonly permissions = shopPermissions([
    'present_product',
    'ask_vehicle_fit',
    'answer_qa',
  ]);
  readonly routing: IntentRouting = {
    allowIntentSwitch: true,
    allowedTransitions: ['pricing', 'delivery', 'after_sales'],
  };
  readonly fallback = defaultFallback;
}

export class PricingIntentProfile implements IntentProfile {
  readonly id = 'pricing' as const;
  readonly context =
    'Wycena orientacyjna z pricing_matrix po jednoznacznym szablonie i wariancie kategorii.';
  readonly instructions =
    'Wycena to quote-vehicle i collect-contact. Kwota tylko z wyniku quoted. Przy many, need_variant albo mat_type_required dopytaj. Przy none i missing_matrix_row nie wymyślaj ceny. Wycena nie jest ofertą wiążącą. collect-contact zbiera imię i telefon; e-mail jest opcjonalny.';
  readonly tools: ShopToolId[] = ['quote-vehicle', 'collect-contact'];
  readonly execution = defaultExecution;
  readonly permissions = shopPermissions([
    'quote_price',
    'ask_variant',
    'collect_contact',
  ]);
  readonly routing: IntentRouting = {
    allowIntentSwitch: true,
    allowedTransitions: ['product_info', 'delivery', 'after_sales'],
  };
  readonly fallback = defaultFallback;
}

export class DeliveryIntentProfile implements IntentProfile {
  readonly id = 'delivery' as const;
  readonly context =
    'Dostawa i terminy z zapisanego faktu sklepu, gdy lookup-leaf zwraca hit.';
  readonly instructions =
    `${FAQ_TURN_PROCEDURE} Z listy search preferuj (tylko jeśli tam są): dostawa, czas-produkcji. Nie otwieraj gwarancji ani czyszczenia. Bez hitu nie zgaduj polityki dostawy i nie opisuj klientowi braku rekordu.`;
  readonly tools: ShopToolId[] = ['lookup-leaf', 'search-leaves'];
  readonly execution = faqExecution;
  readonly permissions = shopPermissions(['answer_delivery']);
  readonly routing: IntentRouting = {
    allowIntentSwitch: true,
    allowedTransitions: ['product_info', 'pricing', 'after_sales'],
  };
  readonly fallback = defaultFallback;
}

export class AfterSalesIntentProfile implements IntentProfile {
  readonly id = 'after_sales' as const;
  readonly context =
    'Pielęgnacja, gwarancja, montaż — z zapisanego faktu sklepu, gdy lookup-leaf zwraca hit.';
  readonly instructions =
    `${FAQ_TURN_PROCEDURE} Z listy search preferuj (tylko jeśli tam są): gwarancja, reklamacja, czyszczenie, montaz, niedopasowanie-wymiana. Bez hitu nie obiecuj kontaktu bez leada Nest i nie opisuj klientowi braku rekordu.`;
  readonly tools: ShopToolId[] = ['lookup-leaf', 'search-leaves'];
  readonly execution = faqExecution;
  readonly permissions = shopPermissions(['answer_after_sales']);
  readonly routing: IntentRouting = {
    allowIntentSwitch: true,
    allowedTransitions: ['product_info', 'pricing', 'delivery'],
  };
  readonly fallback = defaultFallback;
}

export class OutOfScopeIntentProfile implements IntentProfile {
  readonly id = 'out_of_scope' as const;
  readonly context =
    'Poza ofertą sklepu: brak shop-tooli, brak ceny i faktów katalogu.';
  readonly instructions =
    'Nie wołaj narzędzi sklepu. Nie podawaj kwoty ani polityki. Checkout i konto są zakazane.';
  readonly tools: ShopToolId[] = [];
  readonly execution: IntentExecution = {
    mode: 'agent_loop',
    maxToolCalls: 0,
  };
  readonly permissions = shopPermissions([]);
  readonly routing: IntentRouting = {
    allowIntentSwitch: true,
    allowedTransitions: [
      'product_info',
      'pricing',
      'delivery',
      'after_sales',
    ],
  };
  readonly fallback: IntentFallback = {
    onLowConfidence: 'reclassify',
    onToolFailure: 'out_of_scope',
    onUnknownCase: 'out_of_scope',
  };
}

const profiles: Record<ShopIntent, IntentProfile> = {
  product_info: new ProductInfoIntentProfile(),
  pricing: new PricingIntentProfile(),
  delivery: new DeliveryIntentProfile(),
  after_sales: new AfterSalesIntentProfile(),
  out_of_scope: new OutOfScopeIntentProfile(),
};

export function intentProfileFor(intent: string): IntentProfile | undefined {
  if (intent in profiles) {
    return profiles[intent as ShopIntent];
  }
  return undefined;
}
