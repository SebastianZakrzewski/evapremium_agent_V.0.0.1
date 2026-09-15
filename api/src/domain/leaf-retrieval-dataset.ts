/**
 * Gold set for FAQ slug ranking (hybrid retrieval). Not store policy.
 * Calibration source: PROD PL paraphrases 2026-09-15 (index_size 18).
 */

export type LeafRetrievalIntent =
  | 'product_info'
  | 'pricing'
  | 'delivery'
  | 'after_sales'
  | 'out_of_scope';

export type LeafRetrievalCaseKind = 'faq' | 'faq_miss';

export type LeafRetrievalCase = {
  id: string;
  query: string;
  expectSlugs: string[];
  intent: LeafRetrievalIntent;
  kind: LeafRetrievalCaseKind;
  /** Cosine often ranks these above the gold slug (TD-012). */
  hardNegatives?: string[];
};

export type RankingHit = {
  slug: string;
};

export type RankingScores = {
  hitAt1: boolean;
  recallAtK: boolean;
  wrongTop: boolean;
};

export type RankingTally = {
  n: number;
  hitAt1Rate: number;
  recallAtKRate: number;
  wrongTopRate: number;
};

export function evaluateRanking(
  hits: RankingHit[],
  expectSlugs: string[],
  k: number = 4,
): RankingScores {
  if (expectSlugs.length === 0) {
    const empty = hits.length === 0;
    return {
      hitAt1: empty,
      recallAtK: empty,
      wrongTop: !empty,
    };
  }

  const expected = new Set(expectSlugs);
  const topK = hits.slice(0, Math.max(0, k));
  const first = hits[0]?.slug;
  const hitAt1 = first !== undefined && expected.has(first);
  const recallAtK = topK.some((hit) => expected.has(hit.slug));
  return {
    hitAt1,
    recallAtK,
    wrongTop: hits.length > 0 && !hitAt1,
  };
}

export function tallyRankingScores(rows: RankingScores[]): RankingTally {
  const n = rows.length;
  if (n === 0) {
    return { n: 0, hitAt1Rate: 0, recallAtKRate: 0, wrongTopRate: 0 };
  }
  const count = (key: keyof RankingScores) =>
    rows.filter((row) => row[key]).length;
  return {
    n,
    hitAt1Rate: count('hitAt1') / n,
    recallAtKRate: count('recallAtK') / n,
    wrongTopRate: count('wrongTop') / n,
  };
}

export const LEAF_RETRIEVAL_DATASET: LeafRetrievalCase[] = [
  {
    id: 'Q1',
    query: 'Z czego wykonane są dywaniki?',
    expectSlugs: ['material-eva'],
    intent: 'product_info',
    kind: 'faq',
    hardNegatives: ['montaz', '3d-bez-rantow'],
  },
  {
    id: 'Q1b',
    query: 'Z czego są zrobione dywaniki EVA?',
    expectSlugs: ['material-eva'],
    intent: 'product_info',
    kind: 'faq',
  },
  {
    id: 'Q2',
    query: 'Jak czyścić dywaniki EVA?',
    expectSlugs: ['czyszczenie'],
    intent: 'after_sales',
    kind: 'faq',
  },
  {
    id: 'Q2b',
    query: 'Czy można prać dywaniki?',
    expectSlugs: ['czyszczenie'],
    intent: 'after_sales',
    kind: 'faq',
  },
  {
    id: 'Q3',
    query: 'Kiedy wyślecie zamówienie?',
    expectSlugs: ['dostawa'],
    intent: 'delivery',
    kind: 'faq',
    hardNegatives: ['czas-produkcji'],
  },
  {
    id: 'Q3b',
    query: 'kiedy wyślecie dywaniki',
    expectSlugs: ['dostawa'],
    intent: 'delivery',
    kind: 'faq',
    hardNegatives: ['czas-produkcji'],
  },
  {
    id: 'Q4',
    query: 'Ile trwa realizacja / produkcja?',
    expectSlugs: ['czas-produkcji'],
    intent: 'delivery',
    kind: 'faq',
    hardNegatives: ['dostawa'],
  },
  {
    id: 'Q4b',
    query: 'Ile dni szyjecie dywaniki?',
    expectSlugs: ['czas-produkcji'],
    intent: 'delivery',
    kind: 'faq',
    hardNegatives: ['dostawa'],
  },
  {
    id: 'Q5',
    query: 'Jaka jest gwarancja na dywaniki?',
    expectSlugs: ['gwarancja'],
    intent: 'after_sales',
    kind: 'faq',
    hardNegatives: ['niedopasowanie-wymiana', 'reklamacja'],
  },
  {
    id: 'Q5b',
    query: 'Ile mam gwarancji?',
    expectSlugs: ['gwarancja'],
    intent: 'after_sales',
    kind: 'faq',
    hardNegatives: ['niedopasowanie-wymiana'],
  },
  {
    id: 'Q6',
    query: 'Dywaniki nie pasują do auta — co robić?',
    expectSlugs: ['niedopasowanie-wymiana'],
    intent: 'after_sales',
    kind: 'faq',
    hardNegatives: ['dopasowanie-model', 'podpietki'],
  },
  {
    id: 'Q8',
    query: 'Czy są warianty z rantami i bez?',
    expectSlugs: ['3d-z-rantami', '3d-bez-rantow'],
    intent: 'product_info',
    kind: 'faq',
  },
  {
    id: 'Q-kolory',
    query: 'Jakie są kolory dywaników?',
    expectSlugs: ['kolory'],
    intent: 'product_info',
    kind: 'faq',
  },
  {
    id: 'chip-materials',
    query: 'Z czego są zrobione dywaniki i jakie są kolory?',
    expectSlugs: ['material-eva', 'kolory'],
    intent: 'product_info',
    kind: 'faq',
  },
  {
    id: 'chip-delivery',
    query: 'Kiedy wyślecie zamówienie i jak wygląda dostawa?',
    expectSlugs: ['dostawa', 'czas-produkcji'],
    intent: 'delivery',
    kind: 'faq',
    hardNegatives: ['reklamacja'],
  },
  {
    id: 'chip-after-sales',
    query: 'Jaka jest gwarancja i jak czyścić dywaniki EVA?',
    expectSlugs: ['gwarancja', 'czyszczenie'],
    intent: 'after_sales',
    kind: 'faq',
  },
  {
    id: 'chip-fit',
    query: 'Chcę dobrać dywaniki EVA do mojego auta.',
    expectSlugs: ['dopasowanie-model'],
    intent: 'product_info',
    kind: 'faq',
    hardNegatives: ['niedopasowanie-wymiana'],
  },
  // chip-fit: produkcja woła też resolve-template; tu tylko złoto FAQ.
  {
    id: 'M1',
    query: 'zwroty?',
    expectSlugs: [],
    intent: 'after_sales',
    kind: 'faq_miss',
  },
  {
    id: 'M2',
    query: 'jaki mam VIN',
    expectSlugs: [],
    intent: 'out_of_scope',
    kind: 'faq_miss',
  },
];
