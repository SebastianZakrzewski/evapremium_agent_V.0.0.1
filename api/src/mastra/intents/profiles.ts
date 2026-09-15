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
  'Fakty tylko z lookup-leaf (status hit i body). Nie zmyślaj polityki. search-leaves najwyżej raz w turze; query = pytanie klienta. lookup-leaf tylko ze slugów z tego wyniku, od najwyższego score. Nie wymyślaj sluga. Po 1 hicie, którego body odpowiada na pytanie: odpowiedz po polsku i nie wołaj więcej tooli. Drugi lookup tylko gdy pierwszy body nie pokrywa pytania. Nie uśredniaj sprzecznych liści. Pusty search albo sam miss: powiedz, że nie masz faktu. Bez drugiego search. Bez obietnicy kontaktu bez leada Nest.';

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
    `${FAQ_TURN_PROCEDURE} Samo powitanie (cześć, hej, dzień dobry) bez pytania o fakt: przywitaj się krótko i zaproś do wyboru tematu albo auta; bez search-leaves i lookup-leaf. Z listy search preferuj (tylko jeśli tam są): material-eva, kolory, wlasciwosci, parametry, 3d-bez-rantow, 3d-z-rantami. resolve-template tylko gdy klient podał markę/model albo pyta o dopasowanie auta. Nie zgaduj VIN. Bez kwoty.`;
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
    'Najpierw resolve-template. Kwota tylko z quote-price. Przy many dopytaj. Przy none nie wymyślaj ceny. Wycena nie jest ofertą wiążącą.';
  readonly tools: ShopToolId[] = ['resolve-template', 'quote-price'];
  readonly execution = defaultExecution;
  readonly permissions = shopPermissions(['quote_price', 'ask_variant']);
  readonly routing: IntentRouting = {
    allowIntentSwitch: true,
    allowedTransitions: ['product_info', 'delivery', 'after_sales'],
  };
  readonly fallback = defaultFallback;
}

export class DeliveryIntentProfile implements IntentProfile {
  readonly id = 'delivery' as const;
  readonly context =
    'Dostawa i terminy wyłącznie z liści context tree (lookup-leaf).';
  readonly instructions =
    `${FAQ_TURN_PROCEDURE} Z listy search preferuj (tylko jeśli tam są): dostawa, czas-produkcji. Nie otwieraj gwarancji ani czyszczenia. Miss = brak faktu, nie zgaduj polityki dostawy.`;
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
    'Pielęgnacja, gwarancja, montaż — fakty z liści context tree.';
  readonly instructions =
    `${FAQ_TURN_PROCEDURE} Z listy search preferuj (tylko jeśli tam są): gwarancja, reklamacja, czyszczenie, montaz, niedopasowanie-wymiana. Miss = brak faktu; nie obiecuj kontaktu bez leada Nest.`;
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
