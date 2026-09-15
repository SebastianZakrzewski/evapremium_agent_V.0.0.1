import type { ContextNode } from './context-tree';
import {
  searchContextLeaves,
  type ContextLeafVector,
} from './context-leaf-search';
import type {
  LeafRetrievalCase,
  LeafRetrievalIntent,
  RankingScores,
  RankingTally,
} from './leaf-retrieval-dataset';
import {
  evaluateRanking,
  tallyRankingScores,
} from './leaf-retrieval-dataset';
import {
  HYBRID_POOL_TOP_K,
  hybridRankLeaves,
} from './leaf-retrieval-rank';
import type { TfidfIndex } from './leaf-retrieval-tfidf-index';
import { buildTfidfIndex } from './leaf-retrieval-tfidf-index';
import { retrievalTextForSearch } from './context-leaf-ingest';
import {
  evalCorpusNodes,
  LEAF_RETRIEVAL_EVAL_CORPUS,
  type LeafRetrievalBusinessArea,
} from './leaf-retrieval-eval-corpus';

const BUSINESS_AREA_BY_SLUG = new Map(
  LEAF_RETRIEVAL_EVAL_CORPUS.map((row) => [row.slug, row.businessArea]),
);

/** TF-IDF scores differ from OpenAI; low threshold keeps recall in the cosine pool. */
export const OFFLINE_EVAL_COSINE_THRESHOLD = 0;

/** Top-1 cosine below this → treated as empty for faq_miss false-positive stats. */
export const OFFLINE_EVAL_MISS_TOP1_SCORE_MAX = 0.42;

export const OFFLINE_EVAL_TOP_K = 4;

export type LeafRetrievalEvalMethod = 'cosine_only' | 'hybrid';

export type LeafRetrievalEvalRow = {
  id: string;
  intent: LeafRetrievalIntent;
  kind: LeafRetrievalCase['kind'];
  expectSlugs: string[];
  cosineOnly: RankingScores & { top1?: string };
  hybrid: RankingScores & { top1?: string; confidence?: string };
};

export type LeafRetrievalEvalBreakdown = {
  label: string;
  cosine: RankingTally;
  hybrid: RankingTally;
  falsePositiveRate?: number;
};

export type LeafRetrievalEvalReport = {
  generatedAt: string;
  methodNote: string;
  indexSize: number;
  caseCount: number;
  overall: { cosine: RankingTally; hybrid: RankingTally };
  faqOnly: { cosine: RankingTally; hybrid: RankingTally };
  faqMiss: LeafRetrievalEvalBreakdown;
  byIntent: Record<string, LeafRetrievalEvalBreakdown>;
  byBusinessArea: Record<string, LeafRetrievalEvalBreakdown>;
  rows: LeafRetrievalEvalRow[];
};

function businessAreaForCase(
  row: LeafRetrievalCase,
): LeafRetrievalBusinessArea | 'miss' | 'mixed' {
  if (row.kind === 'faq_miss') {
    return 'miss';
  }
  if (row.expectSlugs.length === 0) {
    return 'miss';
  }
  if (row.expectSlugs.length > 1) {
    return 'mixed';
  }
  const slug = row.expectSlugs[0];
  if (slug === undefined) {
    return 'miss';
  }
  return BUSINESS_AREA_BY_SLUG.get(slug) ?? 'product';
}

function tallyForSubset(
  rows: LeafRetrievalEvalRow[],
  pick: (row: LeafRetrievalEvalRow) => RankingScores,
): RankingTally {
  return tallyRankingScores(rows.map((row) => pick(row)));
}

function missFalsePositiveRate(
  rows: LeafRetrievalEvalRow[],
  top1Scores: Map<string, number>,
): number {
  const miss = rows.filter((row) => row.expectSlugs.length === 0);
  if (miss.length === 0) {
    return 0;
  }
  const falsePos = miss.filter((row) => {
    const score = top1Scores.get(row.id) ?? 0;
    return score >= OFFLINE_EVAL_MISS_TOP1_SCORE_MAX && row.hybrid.top1 !== undefined;
  }).length;
  return falsePos / miss.length;
}

export function buildOfflineEvalIndex(nodes: ContextNode[]): {
  index: TfidfIndex;
  vectors: ContextLeafVector[];
} {
  const docs = nodes.map((node) => ({
    slug: node.slug,
    text: retrievalTextForSearch(node),
  }));
  const index = buildTfidfIndex(docs);
  return { index, vectors: index.documentVectors };
}

export function runLeafRetrievalOfflineEval(
  cases: LeafRetrievalCase[],
  nodes: ContextNode[] = evalCorpusNodes(),
): LeafRetrievalEvalReport {
  const { vectors } = buildOfflineEvalIndex(nodes);
  const index = buildTfidfIndex(
    nodes.map((node) => ({
      slug: node.slug,
      text: retrievalTextForSearch(node),
    })),
  );

  const top1CosineScores = new Map<string, number>();
  const rows: LeafRetrievalEvalRow[] = cases.map((row) => {
    const queryVector = index.embed(row.query);
    const cosineHits = searchContextLeaves(
      queryVector,
      vectors,
      nodes,
      OFFLINE_EVAL_COSINE_THRESHOLD,
      HYBRID_POOL_TOP_K,
    );
    top1CosineScores.set(row.id, cosineHits[0]?.score ?? 0);
    const cosineRanked = cosineHits.slice(0, OFFLINE_EVAL_TOP_K);
    const hybridRanked = hybridRankLeaves(row.query, cosineHits, nodes);
    return {
      id: row.id,
      intent: row.intent,
      kind: row.kind,
      expectSlugs: row.expectSlugs,
      cosineOnly: {
        ...evaluateRanking(cosineRanked, row.expectSlugs, OFFLINE_EVAL_TOP_K),
        top1: cosineRanked[0]?.slug,
      },
      hybrid: {
        ...evaluateRanking(hybridRanked, row.expectSlugs, OFFLINE_EVAL_TOP_K),
        top1: hybridRanked[0]?.slug,
        confidence: hybridRanked[0]?.confidence,
      },
    };
  });

  const faqRows = rows.filter((row) => row.kind === 'faq');
  const missRows = rows.filter((row) => row.kind === 'faq_miss');

  const byIntent: Record<string, LeafRetrievalEvalBreakdown> = {};
  for (const intent of [
    'product_info',
    'pricing',
    'delivery',
    'after_sales',
    'out_of_scope',
  ] as LeafRetrievalIntent[]) {
    const subset = rows.filter((row) => row.intent === intent);
    if (subset.length === 0) {
      continue;
    }
    byIntent[intent] = {
      label: intent,
      cosine: tallyForSubset(subset, (r) => r.cosineOnly),
      hybrid: tallyForSubset(subset, (r) => r.hybrid),
    };
  }

  const areaLabels = new Set(
    cases.map((row) => businessAreaForCase(row)),
  );
  const byBusinessArea: Record<string, LeafRetrievalEvalBreakdown> = {};
  for (const area of areaLabels) {
    const subset = rows.filter(
      (r, i) => businessAreaForCase(cases[i]) === area,
    );
    byBusinessArea[area] = {
      label: area,
      cosine: tallyForSubset(subset, (r) => r.cosineOnly),
      hybrid: tallyForSubset(subset, (r) => r.hybrid),
      falsePositiveRate:
        area === 'miss' ? missFalsePositiveRate(subset, top1CosineScores) : undefined,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    methodNote:
      'Offline TF-IDF vectors on retrieval_text (proxy). Cosine pool threshold 0, K=4. Not PROD OpenAI scores.',
    indexSize: nodes.length,
    caseCount: cases.length,
    overall: {
      cosine: tallyRankingScores(rows.map((r) => r.cosineOnly)),
      hybrid: tallyRankingScores(rows.map((r) => r.hybrid)),
    },
    faqOnly: {
      cosine: tallyForSubset(faqRows, (r) => r.cosineOnly),
      hybrid: tallyForSubset(faqRows, (r) => r.hybrid),
    },
    faqMiss: {
      label: 'faq_miss',
      cosine: tallyForSubset(missRows, (r) => r.cosineOnly),
      hybrid: tallyForSubset(missRows, (r) => r.hybrid),
      falsePositiveRate: missFalsePositiveRate(missRows, top1CosineScores),
    },
    byIntent,
    byBusinessArea,
    rows,
  };
}
