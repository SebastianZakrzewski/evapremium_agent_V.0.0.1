import type { ContextNode } from './context-tree';
import { cosineSimilarity, type ContextLeafVector } from './context-leaf-search';
import { retrievalTextForSearch } from './context-leaf-ingest';
import {
  RRF_K,
  fuseRrf,
  hybridSearchLeaves,
  rankBm25,
  type HybridLeafSearchHit,
} from './leaf-retrieval-rank';

/** RRF scores sit near 1/60. Enough to reorder a close pair, not a wide gap. */
export const BRANCH_SOFT_BOOST = 0.02;

export type BranchRecord = {
  slug: string;
  text: string;
  vector: number[];
};

export function applySoftBoost(
  ranked: Array<{ slug: string; score: number }>,
  preferred: readonly string[],
  boost: number = BRANCH_SOFT_BOOST,
): Array<{ slug: string; score: number }> {
  const preferredSet = new Set(preferred);
  return ranked
    .map((row) => ({
      slug: row.slug,
      score: row.score + (preferredSet.has(row.slug) ? boost : 0),
    }))
    .sort((a, b) => b.score - a.score);
}

export function rankBranches(
  query: string,
  queryVector: number[],
  branches: BranchRecord[],
  relatedBranches: readonly string[] = [],
): Array<{ slug: string; score: number }> {
  if (branches.length === 0) {
    return [];
  }
  const cosine = branches
    .map((branch) => ({
      slug: branch.slug,
      score: cosineSimilarity(queryVector, branch.vector),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  const lexical = rankBm25(
    query,
    branches.map((branch) => ({ slug: branch.slug, text: branch.text })),
  ).filter((row) => row.score > 0);
  const fused = fuseRrf([cosine, lexical], RRF_K, branches.length);
  return applySoftBoost(fused, relatedBranches);
}

function isBranch(node: ContextNode, nodes: ContextNode[]): boolean {
  return nodes.some((candidate) => candidate.parentId === node.id);
}

export function branchRecords(
  nodes: ContextNode[],
  index: ContextLeafVector[],
): BranchRecord[] {
  const vectorBySlug = new Map(index.map((row) => [row.slug, row.vector]));
  const records: BranchRecord[] = [];
  for (const node of nodes) {
    if (!node.isActive || !isBranch(node, nodes)) {
      continue;
    }
    const vector = vectorBySlug.get(node.slug);
    if (vector === undefined) {
      continue;
    }
    records.push({
      slug: node.slug,
      text: retrievalTextForSearch(node),
      vector,
    });
  }
  return records;
}

export function hierarchicalSearchLeaves(
  query: string,
  queryVector: number[],
  index: ContextLeafVector[],
  nodes: ContextNode[],
  relatedBranches: readonly string[],
): HybridLeafSearchHit[] {
  const hits = hybridSearchLeaves(query, queryVector, index, nodes);
  if (relatedBranches.length === 0 || hits.length === 0) {
    return hits;
  }
  const rankedBranches = rankBranches(
    query,
    queryVector,
    branchRecords(nodes, index),
    relatedBranches,
  );
  const topBranches = new Set(rankedBranches.slice(0, 3).map((row) => row.slug));
  const idToSlug = new Map(nodes.map((node) => [node.id, node.slug]));
  const boosted = hits.map((hit) => {
    const node = nodes.find((candidate) => candidate.slug === hit.slug);
    const parentSlug =
      node?.parentId === undefined || node.parentId === null
        ? undefined
        : idToSlug.get(node.parentId);
    const bonus =
      parentSlug !== undefined && topBranches.has(parentSlug)
        ? BRANCH_SOFT_BOOST
        : 0;
    return { ...hit, score: hit.score + bonus };
  });
  boosted.sort((a, b) => b.score - a.score);
  return boosted;
}
