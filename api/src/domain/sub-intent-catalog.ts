export const TURN_MODES = ['knowledge', 'action', 'ambiguous'] as const;

export type TurnMode = (typeof TURN_MODES)[number];

export const PARENT_INTENTS = [
  'product_info',
  'pricing',
  'delivery',
  'after_sales',
] as const;

export type ParentIntent = (typeof PARENT_INTENTS)[number];

export const SUB_INTENT_SLUGS = [
  'available_colors',
  'material',
  'fitment',
  'delivery_info',
  'indicative_quote',
  'complaint_info',
] as const;

export type SubIntentSlug = (typeof SUB_INTENT_SLUGS)[number];

export const CATALOG_TOOL_IDS = [
  'resolve-template',
  'quote-price',
  'quote-vehicle',
  'lookup-leaf',
  'search-leaves',
] as const;

export type CatalogToolId = (typeof CATALOG_TOOL_IDS)[number];

export type RouterEntities = {
  car_brand?: string;
  car_model?: string;
};

export type EntityKey = keyof RouterEntities;

export type SubIntentConfig = {
  slug: SubIntentSlug;
  name: string;
  description: string;
  parentIntent: ParentIntent;
  examples: {
    knowledge: string[];
    action: string[];
  };
  negativeExamples: string[];
  relatedBranches: string[];
  allowedModes: TurnMode[];
  allowedTools: CatalogToolId[];
  relatedWorkflows: string[];
  directTool?: CatalogToolId;
  requiredInputs: EntityKey[];
  fallbackWorkflow?: string;
};

const knowledgeFaq = ['lookup-leaf', 'search-leaves'] as const;

export const SUB_INTENT_CATALOG: readonly SubIntentConfig[] = [
  {
    slug: 'available_colors',
    name: 'Dostępne kolory',
    description:
      'Klient pyta, jakie kolory dywaników są w ofercie, bez prośby o dobór pod wnętrze.',
    parentIntent: 'product_info',
    examples: {
      knowledge: ['Jakie macie kolory?', 'W jakich barwach są dywaniki?'],
      action: [],
    },
    negativeExamples: ['Pomóż dobrać kolor do czarnego wnętrza.', 'Ile trwa dostawa?'],
    relatedBranches: ['kolory'],
    allowedModes: ['knowledge'],
    allowedTools: [...knowledgeFaq],
    relatedWorkflows: [],
    requiredInputs: [],
  },
  {
    slug: 'material',
    name: 'Materiał',
    description: 'Klient pyta o materiał EVA, strukturę albo trwałość dywanika.',
    parentIntent: 'product_info',
    examples: {
      knowledge: ['Z czego są dywaniki?', 'Jaki to materiał?'],
      action: [],
    },
    negativeExamples: ['Jakie macie kolory?', 'Ile kosztują dywaniki?'],
    relatedBranches: ['material'],
    allowedModes: ['knowledge'],
    allowedTools: [...knowledgeFaq],
    relatedWorkflows: [],
    requiredInputs: [],
  },
  {
    slug: 'fitment',
    name: 'Dopasowanie',
    description:
      'Klient pyta, czy dywaniki pasują do konkretnego auta, albo chce je dopasować.',
    parentIntent: 'product_info',
    examples: {
      knowledge: ['Czy dywaniki pasują do Golfa 8?'],
      action: ['Dobierz dywaniki do Golfa 8.'],
    },
    negativeExamples: ['Jakie macie kolory?', 'Ile kosztują dywaniki?'],
    relatedBranches: ['dopasowanie'],
    allowedModes: ['knowledge', 'action'],
    allowedTools: ['resolve-template', ...knowledgeFaq],
    relatedWorkflows: [],
    directTool: 'resolve-template',
    requiredInputs: ['car_brand', 'car_model'],
  },
  {
    slug: 'delivery_info',
    name: 'Dostawa',
    description: 'Klient pyta o termin wysyłki albo sposób dostawy.',
    parentIntent: 'delivery',
    examples: {
      knowledge: ['Jaki jest termin dostawy?', 'Kiedy wyślecie dywaniki?'],
      action: [],
    },
    negativeExamples: ['Ile kosztują dywaniki?', 'Jak złożyć reklamację?'],
    relatedBranches: ['dostawa'],
    allowedModes: ['knowledge'],
    allowedTools: [...knowledgeFaq],
    relatedWorkflows: [],
    requiredInputs: [],
  },
  {
    slug: 'indicative_quote',
    name: 'Wycena orientacyjna',
    description:
      'Klient chce orientacyjną kwotę za dywaniki albo pyta, skąd bierze się cena.',
    parentIntent: 'pricing',
    examples: {
      knowledge: ['Jak liczona jest cena?'],
      action: ['Ile kosztują dywaniki do Golfa 8?'],
    },
    negativeExamples: ['Jaki jest termin dostawy?', 'Jakie macie kolory?'],
    relatedBranches: [],
    allowedModes: ['knowledge', 'action'],
    allowedTools: ['quote-vehicle'],
    relatedWorkflows: ['quote_vehicle'],
    directTool: 'quote-vehicle',
    requiredInputs: ['car_brand', 'car_model'],
    fallbackWorkflow: 'quote_vehicle',
  },
  {
    slug: 'complaint_info',
    name: 'Reklamacja — informacja',
    description:
      'Klient pyta, jak wygląda reklamacja. Złożenie reklamacji nie ma toola w tym katalogu.',
    parentIntent: 'after_sales',
    examples: {
      knowledge: ['Jak wygląda reklamacja?'],
      action: [],
    },
    negativeExamples: ['Ile trwa dostawa?', 'Ile kosztują dywaniki?'],
    relatedBranches: ['reklamacja'],
    allowedModes: ['knowledge'],
    allowedTools: [...knowledgeFaq],
    relatedWorkflows: [],
    requiredInputs: [],
  },
];

const bySlug = new Map(SUB_INTENT_CATALOG.map((row) => [row.slug, row]));

export function subIntentBySlug(slug: string): SubIntentConfig | undefined {
  return bySlug.get(slug as SubIntentSlug);
}
