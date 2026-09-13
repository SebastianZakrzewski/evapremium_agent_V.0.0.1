import type { ContextNode } from './context-tree';

export type ContextLeafSearchHit = {
  slug: string;
  score: number;
};

export type ContextLeafVector = {
  slug: string;
  vector: number[];
};

function cosine(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let left = 0;
  let right = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    left += x * x;
    right += y * y;
  }
  const denom = Math.sqrt(left) * Math.sqrt(right);
  return denom === 0 ? 0 : dot / denom;
}

function isLeaf(node: ContextNode, nodes: ContextNode[]): boolean {
  return !nodes.some((candidate) => candidate.parentId === node.id);
}

export function searchContextLeaves(
  queryVector: number[],
  index: ContextLeafVector[],
  nodes: ContextNode[],
  threshold: number,
): ContextLeafSearchHit[] {
  const hits: ContextLeafSearchHit[] = [];
  for (const entry of index) {
    const node = nodes.find((row) => row.slug === entry.slug);
    if (
      node === undefined ||
      !node.isActive ||
      node.body.trim() === '' ||
      !isLeaf(node, nodes)
    ) {
      continue;
    }
    const score = cosine(queryVector, entry.vector);
    if (score >= threshold) {
      hits.push({ slug: entry.slug, score });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits;
}

