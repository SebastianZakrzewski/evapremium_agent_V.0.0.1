import { intentProfileFor } from '../intents/profiles';
import type { ShopIntent, ShopToolId } from '../intents/schema';

export const AGENT_EFFECTIVENESS_WEIGHTS = {
  m1_intent: 10,
  m2_tools_in_bounds: 15,
  m3_tool_scenario: 20,
  m4_no_slug_hallucination: 20,
  m5_no_fact_hallucination: 15,
  m6_answer_quality: 15,
  m7_loop_discipline: 5,
} as const;

export type EffectivenessMetricId = keyof typeof AGENT_EFFECTIVENESS_WEIGHTS;

export const EFFECTIVENESS_METRIC_IDS = Object.keys(
  AGENT_EFFECTIVENESS_WEIGHTS,
) as EffectivenessMetricId[];

export type ToolCallTrace = {
  id: ShopToolId;
  input?: Record<string, unknown>;
  output?: unknown;
};

export type EffectivenessScenarioKind =
  | 'faq'
  | 'pricing'
  | 'out_of_scope'
  | 'faq_miss';

export type EffectivenessScenario = {
  id: string;
  message: string;
  expectedIntent: ShopIntent;
  kind: EffectivenessScenarioKind;
  quality: {
    mustMatch?: RegExp;
    missOk?: RegExp;
  };
};

export const EFFECTIVENESS_SCENARIOS: EffectivenessScenario[] = [
  {
    id: 'S1',
    message: 'Jakie są kolory dywaników?',
    expectedIntent: 'product_info',
    kind: 'faq',
    quality: { mustMatch: /kolor/i },
  },
  {
    id: 'S2',
    message: 'Z czego wykonane są dywaniki?',
    expectedIntent: 'product_info',
    kind: 'faq',
    quality: { mustMatch: /eva|piank/i },
  },
  {
    id: 'S3',
    message: 'Ile mam gwarancji?',
    expectedIntent: 'after_sales',
    kind: 'faq',
    quality: { mustMatch: /rok|roczn|12\s*mies/i },
  },
  {
    id: 'S4',
    message: 'Jak czyścić dywaniki EVA?',
    expectedIntent: 'after_sales',
    kind: 'faq',
    quality: { mustMatch: /czyś|myc|woda|wilgo/i },
  },
  {
    id: 'S5',
    message: 'Kiedy wyślecie zamówienie?',
    expectedIntent: 'delivery',
    kind: 'faq',
    quality: { mustMatch: /wysył|kurier|dzień|tygod|realiz/i },
  },
  {
    id: 'S6',
    message: 'Ile kosztują dywaniki do Audi A4 2018 sedan?',
    expectedIntent: 'pricing',
    kind: 'pricing',
    quality: {},
  },
  {
    id: 'S7',
    message: 'test',
    expectedIntent: 'out_of_scope',
    kind: 'out_of_scope',
    quality: { missOk: /dzień dobry|pomog|dywan/i },
  },
  {
    id: 'S8',
    message: 'zwroty?',
    expectedIntent: 'after_sales',
    kind: 'faq_miss',
    quality: { missOk: /nie mam|nie potwierdz|brak|nie chcę zgad/i },
  },
];

export type ScenarioTrace = {
  scenario: EffectivenessScenario;
  acceptedIntent: ShopIntent | undefined;
  calls: ToolCallTrace[];
  answer: string;
};

export type ScenarioScores = Record<EffectivenessMetricId, 0 | 1>;

function searchSlugs(calls: ToolCallTrace[]): Set<string> {
  const slugs = new Set<string>();
  for (const call of calls) {
    if (call.id !== 'search-leaves' || !Array.isArray(call.output)) {
      continue;
    }
    for (const row of call.output) {
      if (
        row &&
        typeof row === 'object' &&
        'slug' in row &&
        typeof row.slug === 'string'
      ) {
        slugs.add(row.slug);
      }
    }
  }
  return slugs;
}

function lookups(calls: ToolCallTrace[]): string[] {
  return calls
    .filter((call) => call.id === 'lookup-leaf')
    .map((call) => String(call.input?.slug ?? ''));
}

function lookupHits(calls: ToolCallTrace[]): string[] {
  const hits: string[] = [];
  for (const call of calls) {
    if (call.id !== 'lookup-leaf' || !call.output || typeof call.output !== 'object') {
      continue;
    }
    const row = call.output as { status?: string; slug?: string };
    if (row.status === 'hit' && typeof row.slug === 'string') {
      hits.push(row.slug);
    }
  }
  return hits;
}

function quoted(calls: ToolCallTrace[]): boolean {
  return calls.some(
    (call) =>
      call.id === 'quote-price' &&
      call.output &&
      typeof call.output === 'object' &&
      (call.output as { status?: string }).status === 'quoted',
  );
}

function hasInventedPrice(answer: string, calls: ToolCallTrace[]): boolean {
  if (quoted(calls)) {
    return false;
  }
  return /\b\d{2,5}\s*(zł|pln)\b/i.test(answer);
}

function hasInventedReturnPolicy(answer: string, calls: ToolCallTrace[]): boolean {
  if (lookupHits(calls).length > 0) {
    return false;
  }
  return /zwrot/i.test(answer) && /(14\s*dni|pieniądz|zwrot środków)/i.test(answer);
}

function scoreM3(trace: ScenarioTrace): 0 | 1 {
  const { kind } = trace.scenario;
  const ids = trace.calls.map((call) => call.id);
  const searches = ids.filter((id) => id === 'search-leaves').length;
  if (kind === 'pricing') {
    return ids.includes('resolve-template') && searches === 0 ? 1 : 0;
  }
  if (kind === 'out_of_scope') {
    return ids.length === 0 ? 1 : 0;
  }
  if (searches > 1) {
    return 0;
  }
  const allowed = searchSlugs(trace.calls);
  for (const slug of lookups(trace.calls)) {
    if (slug !== '' && !allowed.has(slug)) {
      return 0;
    }
  }
  return 1;
}

function scoreM6(trace: ScenarioTrace): 0 | 1 {
  const { quality, kind } = trace.scenario;
  const text = trace.answer;
  if (kind === 'pricing') {
    if (hasInventedPrice(text, trace.calls)) {
      return 0;
    }
    if (quoted(trace.calls) && /\d/.test(text)) {
      return 1;
    }
    return /wariant|kategori|doprecyz|który|jaki komplet|nadwozi/i.test(text)
      ? 1
      : 0;
  }
  if (kind === 'out_of_scope' || kind === 'faq_miss') {
    if (hasInventedReturnPolicy(text, trace.calls) || hasInventedPrice(text, trace.calls)) {
      return 0;
    }
    return quality.missOk?.test(text) ? 1 : 0;
  }
  if (lookupHits(trace.calls).length === 0) {
    return quality.missOk?.test(text) ? 1 : 0;
  }
  return quality.mustMatch?.test(text) ? 1 : 0;
}

export function scoreScenario(trace: ScenarioTrace): ScenarioScores {
  const expected = trace.scenario.expectedIntent;
  const profile = intentProfileFor(expected);
  const allowed = new Set(profile?.tools ?? []);
  const ids = trace.calls.map((call) => call.id);
  const searches = ids.filter((id) => id === 'search-leaves').length;
  const m1: 0 | 1 = trace.acceptedIntent === expected ? 1 : 0;
  const m2: 0 | 1 = ids.every((id) => allowed.has(id)) ? 1 : 0;
  const m3 = scoreM3(trace);
  const allowedSlugs = searchSlugs(trace.calls);
  const m4: 0 | 1 = lookups(trace.calls).every((slug) =>
    allowedSlugs.has(slug),
  )
    ? 1
    : 0;
  const m5: 0 | 1 =
    !hasInventedPrice(trace.answer, trace.calls) &&
    !hasInventedReturnPolicy(trace.answer, trace.calls)
      ? 1
      : 0;
  const m6 = scoreM6(trace);
  const cap = profile?.execution.maxToolCalls ?? 0;
  const m7: 0 | 1 =
    trace.calls.length <= cap &&
    (trace.scenario.kind === 'faq' || trace.scenario.kind === 'faq_miss'
      ? searches <= 1
      : true)
      ? 1
      : 0;
  return {
    m1_intent: m1,
    m2_tools_in_bounds: m2,
    m3_tool_scenario: m3,
    m4_no_slug_hallucination: m4,
    m5_no_fact_hallucination: m5,
    m6_answer_quality: m6,
    m7_loop_discipline: m7,
  };
}

export type EffectivenessReport = {
  label: string;
  n: number;
  rates: Record<EffectivenessMetricId, number>;
  weighted: number;
  perScenario: Array<{
    id: string;
    scores: ScenarioScores;
    acceptedIntent: ShopIntent | undefined;
    tools: ShopToolId[];
  }>;
};

export function aggregateEffectiveness(
  traces: ScenarioTrace[],
  label: string,
): EffectivenessReport {
  const perScenario = traces.map((trace) => ({
    id: trace.scenario.id,
    scores: scoreScenario(trace),
    acceptedIntent: trace.acceptedIntent,
    tools: trace.calls.map((call) => call.id),
  }));
  const rates = {} as Record<EffectivenessMetricId, number>;
  for (const id of EFFECTIVENESS_METRIC_IDS) {
    const sum = perScenario.reduce((acc, row) => acc + row.scores[id], 0);
    rates[id] = traces.length === 0 ? 0 : (100 * sum) / traces.length;
  }
  let weighted = 0;
  let weightSum = 0;
  for (const id of EFFECTIVENESS_METRIC_IDS) {
    const weight = AGENT_EFFECTIVENESS_WEIGHTS[id];
    weighted += rates[id] * weight;
    weightSum += weight;
  }
  return {
    label,
    n: traces.length,
    rates,
    weighted: weightSum === 0 ? 0 : weighted / weightSum,
    perScenario,
  };
}
