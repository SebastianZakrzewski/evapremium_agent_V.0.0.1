import type { ContextNode } from './context-tree';
import {
  cosineSimilarity,
  type ContextLeafVector,
} from './context-leaf-search';

/** Undirected k-NN degree before the symmetric union. */
export const CONTEXT_SIMILARITY_NEIGHBORS = 3;

export type ContextSimilarityNode = {
  slug: string;
  title: string;
  x: number;
  y: number;
};

export type ContextSimilarityEdge = {
  source: string;
  target: string;
  similarity: number;
};

export type ContextSimilarityGraph = {
  nodes: ContextSimilarityNode[];
  edges: ContextSimilarityEdge[];
};

const DRAW_MARGIN = 0.12;

function isLeaf(node: ContextNode, nodes: ContextNode[]): boolean {
  return !nodes.some((candidate) => candidate.parentId === node.id);
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function jacobiEigen(matrix: number[][]): {
  values: number[];
  vectors: number[][];
} {
  const n = matrix.length;
  const a = matrix.map((row) => [...row]);
  const vectors: number[][] = Array.from({ length: n }, (_, row) =>
    Array.from({ length: n }, (_, column) => (row === column ? 1 : 0)),
  );

  for (let sweep = 0; sweep < 32; sweep += 1) {
    let offDiagonal = 0;
    for (let p = 0; p < n; p += 1) {
      for (let q = p + 1; q < n; q += 1) {
        offDiagonal += Math.abs(a[p]?.[q] ?? 0);
      }
    }
    if (offDiagonal < 1e-12) {
      break;
    }

    for (let p = 0; p < n - 1; p += 1) {
      for (let q = p + 1; q < n; q += 1) {
        const apq = a[p]?.[q] ?? 0;
        if (Math.abs(apq) < 1e-15) {
          continue;
        }
        const app = a[p]?.[p] ?? 0;
        const aqq = a[q]?.[q] ?? 0;
        const tau = (aqq - app) / (2 * apq);
        const tangent =
          tau === 0
            ? 1
            : Math.sign(tau) / (Math.abs(tau) + Math.sqrt(1 + tau * tau));
        const cosine = 1 / Math.sqrt(1 + tangent * tangent);
        const sine = tangent * cosine;

        if (a[p]) {
          a[p][p] = app - tangent * apq;
          a[p][q] = 0;
        }
        if (a[q]) {
          a[q][q] = aqq + tangent * apq;
          a[q][p] = 0;
        }

        for (let k = 0; k < n; k += 1) {
          if (k === p || k === q) {
            continue;
          }
          const aik = a[k]?.[p] ?? 0;
          const akq = a[k]?.[q] ?? 0;
          const nextP = cosine * aik - sine * akq;
          const nextQ = sine * aik + cosine * akq;
          if (a[k]) {
            a[k][p] = nextP;
            a[k][q] = nextQ;
          }
          if (a[p]) {
            a[p][k] = nextP;
          }
          if (a[q]) {
            a[q][k] = nextQ;
          }
        }

        for (let k = 0; k < n; k += 1) {
          const vip = vectors[k]?.[p] ?? 0;
          const viq = vectors[k]?.[q] ?? 0;
          if (vectors[k]) {
            vectors[k][p] = cosine * vip - sine * viq;
            vectors[k][q] = sine * vip + cosine * viq;
          }
        }
      }
    }
  }

  return {
    values: a.map((row, index) => row[index] ?? 0),
    vectors,
  };
}

function orientAxis(coords: number[], slugs: string[]): number[] {
  let pivot = -1;
  let magnitude = 0;
  for (let index = 0; index < coords.length; index += 1) {
    const value = Math.abs(coords[index] ?? 0);
    if (value <= 1e-8) {
      continue;
    }
    const slug = slugs[index] ?? '';
    const pivotSlug = slugs[pivot] ?? '';
    if (
      pivot < 0 ||
      value > magnitude + 1e-12 ||
      (Math.abs(value - magnitude) <= 1e-12 && slug < pivotSlug)
    ) {
      pivot = index;
      magnitude = value;
    }
  }
  if (pivot >= 0 && (coords[pivot] ?? 0) < 0) {
    return coords.map((value) => -value);
  }
  return coords;
}

function place(xs: number[], ys: number[]): Array<{ x: number; y: number }> {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let index = 0; index < xs.length; index += 1) {
    const x = xs[index] ?? 0;
    const y = ys[index] ?? 0;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const span = Math.max(maxX - minX, maxY - minY);
  if (span < 1e-8) {
    return xs.map(() => ({ x: 0.5, y: 0.5 }));
  }
  const scale = (1 - 2 * DRAW_MARGIN) / span;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  return xs.map((x, index) => ({
    x: round6(0.5 + ((x ?? 0) - midX) * scale),
    y: round6(0.5 + ((ys[index] ?? 0) - midY) * scale),
  }));
}

function embedPositions(
  slugs: string[],
  vectors: number[][],
): Array<{ x: number; y: number }> {
  const n = slugs.length;
  if (n === 0) {
    return [];
  }
  if (n === 1) {
    return [{ x: 0.5, y: 0.5 }];
  }

  const squared = Array.from({ length: n }, (_, row) =>
    Array.from({ length: n }, (_, column) => {
      const similarity = cosineSimilarity(
        vectors[row] ?? [],
        vectors[column] ?? [],
      );
      const distance = 1 - Math.max(-1, Math.min(1, similarity));
      return distance * distance;
    }),
  );
  const rowMean = squared.map(
    (row) => row.reduce((sum, value) => sum + value, 0) / n,
  );
  const grand = rowMean.reduce((sum, value) => sum + value, 0) / n;
  const centered = squared.map((row, i) =>
    row.map(
      (value, j) =>
        -0.5 * (value - (rowMean[i] ?? 0) - (rowMean[j] ?? 0) + grand),
    ),
  );
  const eigen = jacobiEigen(centered);
  const order = eigen.values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => right.value - left.value || left.index - right.index);

  const axes = [0, 1].map((axis) => {
    const pick = order[axis];
    if (pick === undefined || pick.value <= 1e-10) {
      return Array.from({ length: n }, () => 0);
    }
    const scale = Math.sqrt(pick.value);
    return eigen.vectors.map((row) => (row[pick.index] ?? 0) * scale);
  });
  const xs = orientAxis(axes[0] ?? [], slugs);
  const ys = orientAxis(axes[1] ?? [], slugs);
  return place(xs, ys);
}

export function buildContextSimilarityGraph(
  nodes: ContextNode[],
  vectors: ContextLeafVector[],
): ContextSimilarityGraph {
  const catalog = new Map<string, ContextNode>();
  for (const node of nodes) {
    if (!catalog.has(node.slug)) {
      catalog.set(node.slug, node);
    }
  }

  const leaves: Array<{ slug: string; title: string; vector: number[] }> = [];
  const seen = new Set<string>();
  for (const entry of vectors) {
    if (seen.has(entry.slug) || entry.vector.length === 0) {
      continue;
    }
    const node = catalog.get(entry.slug);
    if (node === undefined || !node.isActive || !isLeaf(node, nodes)) {
      continue;
    }
    seen.add(entry.slug);
    leaves.push({ slug: node.slug, title: node.title, vector: entry.vector });
  }
  leaves.sort((left, right) => left.slug.localeCompare(right.slug));

  const positions = embedPositions(
    leaves.map((leaf) => leaf.slug),
    leaves.map((leaf) => leaf.vector),
  );
  const graphNodes = leaves.map((leaf, index) => ({
    slug: leaf.slug,
    title: leaf.title,
    x: positions[index]?.x ?? 0.5,
    y: positions[index]?.y ?? 0.5,
  }));

  const neighborCount = Math.min(
    CONTEXT_SIMILARITY_NEIGHBORS,
    Math.max(0, leaves.length - 1),
  );
  const edges = new Map<string, ContextSimilarityEdge>();
  for (let index = 0; index < leaves.length; index += 1) {
    const ranked = leaves
      .map((leaf, other) => ({
        other,
        similarity: cosineSimilarity(
          leaves[index]?.vector ?? [],
          leaf.vector,
        ),
      }))
      .filter((row) => row.other !== index)
      .sort(
        (left, right) =>
          right.similarity - left.similarity ||
          (leaves[left.other]?.slug ?? '').localeCompare(
            leaves[right.other]?.slug ?? '',
          ),
      )
      .slice(0, neighborCount);
    for (const neighbor of ranked) {
      const leftSlug = leaves[index]?.slug ?? '';
      const rightSlug = leaves[neighbor.other]?.slug ?? '';
      const source = leftSlug < rightSlug ? leftSlug : rightSlug;
      const target = leftSlug < rightSlug ? rightSlug : leftSlug;
      edges.set(`${source}\0${target}`, {
        source,
        target,
        similarity: round6(neighbor.similarity),
      });
    }
  }

  return {
    nodes: graphNodes,
    edges: [...edges.values()].sort(
      (left, right) =>
        left.source.localeCompare(right.source) ||
        left.target.localeCompare(right.target),
    ),
  };
}
