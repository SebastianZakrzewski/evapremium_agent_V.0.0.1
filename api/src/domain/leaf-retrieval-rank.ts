import type { ContextNode } from './context-tree';
import { retrievalTextForSearch } from './context-leaf-ingest';
import {
  CONTEXT_LEAF_SEARCH_THRESHOLD,
  searchContextLeaves,
  type ContextLeafSearchHit,
  type ContextLeafVector,
  type LeafSearchConfidence,
} from './context-leaf-search';

export const RRF_K = 60;
export const HYBRID_POOL_TOP_K = 10;
export const HYBRID_AGENT_TOP_K = 4;

export type HybridLeafSearchHit = {
  slug: string;
  score: number;
  confidence: LeafSearchConfidence;
};

const PL_DIACRITICS: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

export function normalizeRetrievalToken(raw: string): string {
  const lower = raw.toLowerCase();
  let out = '';
  for (const char of lower) {
    out += PL_DIACRITICS[char] ?? char;
  }
  return out;
}

export function tokenizeRetrieval(text: string): string[] {
  const normalized = normalizeRetrievalToken(text);
  const tokens = normalized.split(/[^a-z0-9]+/u).filter((t) => t.length >= 2);
  return tokens;
}

export type Bm25Document = {
  slug: string;
  text: string;
};

const BM25_K1 = 1.2;
const BM25_B = 0.75;

function idf(n: number, df: number): number {
  return Math.log(1 + (n - df + 0.5) / (df + 0.5));
}

export function rankBm25(
  query: string,
  documents: Bm25Document[],
): Array<{ slug: string; score: number }> {
  if (documents.length === 0) {
    return [];
  }
  const queryTerms = [...new Set(tokenizeRetrieval(query))];
  if (queryTerms.length === 0) {
    return [];
  }

  const docTokens = documents.map((doc) => ({
    slug: doc.slug,
    tokens: tokenizeRetrieval(doc.text),
  }));
  const avgLen =
    docTokens.reduce((sum, row) => sum + row.tokens.length, 0) /
    docTokens.length;

  const df = new Map<string, number>();
  for (const term of queryTerms) {
    let count = 0;
    for (const row of docTokens) {
      if (row.tokens.includes(term)) {
        count += 1;
      }
    }
    df.set(term, count);
  }

  const scored = docTokens.map((row) => {
    const len = row.tokens.length;
    let score = 0;
    for (const term of queryTerms) {
      const tf = row.tokens.filter((t) => t === term).length;
      if (tf === 0) {
        continue;
      }
      const termDf = df.get(term) ?? 0;
      const termIdf = idf(documents.length, termDf);
      const denom = tf + BM25_K1 * (1 - BM25_B + (BM25_B * len) / avgLen);
      score += termIdf * ((tf * (BM25_K1 + 1)) / denom);
    }
    return { slug: row.slug, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export function fuseRrf(
  rankings: Array<Array<{ slug: string }>>,
  k: number = RRF_K,
  topK: number = HYBRID_POOL_TOP_K,
): Array<{ slug: string; score: number }> {
  const scores = new Map<string, number>();
  const tieBreakRank = new Map<string, number>();
  for (let r = 0; r < rankings.length; r += 1) {
    const ranking = rankings[r];
    for (let i = 0; i < ranking.length; i += 1) {
      const slug = ranking[i]?.slug;
      if (!slug) {
        continue;
      }
      const add = 1 / (k + i + 1);
      scores.set(slug, (scores.get(slug) ?? 0) + add);
      if (r === rankings.length - 1) {
        tieBreakRank.set(slug, i);
      }
    }
  }
  const fused = [...scores.entries()]
    .map(([slug, score]) => ({ slug, score }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      const aRank = tieBreakRank.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
      const bRank = tieBreakRank.get(b.slug) ?? Number.MAX_SAFE_INTEGER;
      return aRank - bRank;
    });
  return fused.slice(0, Math.max(0, topK));
}

export type RerankCandidate = {
  slug: string;
  retrievalText: string;
};

export function lexicalRerank(
  query: string,
  candidates: RerankCandidate[],
): Array<{ slug: string; score: number }> {
  const queryTerms = new Set(tokenizeRetrieval(query));
  if (queryTerms.size === 0) {
    return candidates.map((row, index) => ({
      slug: row.slug,
      score: 1 / (index + 1),
    }));
  }

  const scored = candidates.map((row) => {
    const docTerms = new Set(tokenizeRetrieval(row.retrievalText));
    let overlap = 0;
    for (const term of queryTerms) {
      if (docTerms.has(term)) {
        overlap += 1;
      }
    }
    const slugBoost = tokenizeRetrieval(row.slug).filter((t) =>
      queryTerms.has(t),
    ).length;
    return { slug: row.slug, score: overlap + slugBoost * 0.5 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/** Normalized gap between top-1 and top-2 rerank scores. */
export const CONFIDENCE_MARGIN_THRESHOLD = 0.15;

export function confidenceFromMargin(
  topScore: number,
  secondScore: number | undefined,
): LeafSearchConfidence {
  if (secondScore === undefined) {
    return 'high';
  }
  const max = Math.max(topScore, secondScore, 1e-6);
  const margin = (topScore - secondScore) / max;
  return margin >= CONFIDENCE_MARGIN_THRESHOLD ? 'high' : 'ambiguous';
}

function eligibleSearchLeaves(nodes: ContextNode[]): ContextNode[] {
  return nodes.filter((node) => {
    const isLeaf = !nodes.some((candidate) => candidate.parentId === node.id);
    return node.isActive && isLeaf && retrievalTextForSearch(node).trim() !== '';
  });
}

export function hybridRankLeaves(
  query: string,
  cosineHits: ContextLeafSearchHit[],
  nodes: ContextNode[],
): HybridLeafSearchHit[] {
  const leaves = eligibleSearchLeaves(nodes);
  if (leaves.length === 0) {
    return [];
  }

  const bm25Docs: Bm25Document[] = leaves.map((node) => ({
    slug: node.slug,
    text: retrievalTextForSearch(node),
  }));
  const bm25Hits = rankBm25(query, bm25Docs).filter((row) => row.score > 0);

  const fused = fuseRrf(
    [cosineHits, bm25Hits],
    RRF_K,
    HYBRID_POOL_TOP_K,
  );
  if (fused.length === 0) {
    return [];
  }

  const bySlug = new Map(leaves.map((node) => [node.slug, node]));
  const pool: RerankCandidate[] = [];
  for (const row of fused) {
    const node = bySlug.get(row.slug);
    if (node === undefined) {
      continue;
    }
    pool.push({
      slug: row.slug,
      retrievalText: retrievalTextForSearch(node),
    });
  }
  if (pool.length === 0) {
    return [];
  }

  const reranked = lexicalRerank(query, pool);
  const rrfBySlug = new Map(fused.map((row) => [row.slug, row.score]));
  const top = reranked[0];
  const second = reranked[1];
  const confidence = confidenceFromMargin(
    top?.score ?? 0,
    second?.score,
  );

  const agentCap =
    confidence === 'ambiguous'
      ? Math.min(3, HYBRID_AGENT_TOP_K)
      : HYBRID_AGENT_TOP_K;

  return reranked.slice(0, agentCap).map((row) => ({
    slug: row.slug,
    score: rrfBySlug.get(row.slug) ?? row.score,
    confidence,
  }));
}

export function hybridSearchLeaves(
  query: string,
  queryVector: number[],
  index: ContextLeafVector[],
  nodes: ContextNode[],
): HybridLeafSearchHit[] {
  const cosineHits = searchContextLeaves(
    queryVector,
    index,
    nodes,
    CONTEXT_LEAF_SEARCH_THRESHOLD,
    HYBRID_POOL_TOP_K,
  );
  return hybridRankLeaves(query, cosineHits, nodes);
}
