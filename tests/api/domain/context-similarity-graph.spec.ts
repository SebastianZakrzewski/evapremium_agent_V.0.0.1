import type { ContextNode } from '@api/domain/context-tree';
import { buildContextSimilarityGraph } from '@api/domain/context-similarity-graph';

function leaf(slug: string, title: string): ContextNode {
  return {
    id: `id-${slug}`,
    parentId: 'branch-info',
    slug,
    title,
    body: `fakt ${slug}`,
    sortOrder: 1,
    isActive: true,
  };
}

const nodes: ContextNode[] = [
  {
    id: 'branch-info',
    parentId: null,
    slug: 'info',
    title: 'Informacje',
    body: 'gałąź',
    sortOrder: 0,
    isActive: true,
  },
  leaf('alfa', 'Alfa'),
  leaf('beta', 'Beta'),
  leaf('gamma', 'Gamma'),
  leaf('delta', 'Delta'),
  leaf('epsilon', 'Epsilon'),
  {
    id: 'id-archiwum',
    parentId: 'branch-info',
    slug: 'archiwum',
    title: 'Archiwum',
    body: 'nieaktywny',
    sortOrder: 9,
    isActive: false,
  },
];

const vectors = [
  { slug: 'alfa', vector: [1, 0, 0] },
  { slug: 'beta', vector: [0.96, 0.28, 0] },
  { slug: 'gamma', vector: [0.6, 0.8, 0] },
  { slug: 'delta', vector: [0.2, 0.98, 0] },
  { slug: 'epsilon', vector: [0, 1, 0] },
  { slug: 'info', vector: [1, 1, 1] },
  { slug: 'archiwum', vector: [0, 0, 1] },
];

function planeDistance(
  left: { x: number; y: number },
  right: { x: number; y: number },
): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

describe('context similarity graph', () => {
  it('places close leaves nearer than distant ones and omits vectors and body', () => {
    const graph = buildContextSimilarityGraph(nodes, vectors);
    expect(graph.nodes.map((node) => node.slug)).toEqual([
      'alfa',
      'beta',
      'delta',
      'epsilon',
      'gamma',
    ]);
    expect(graph.nodes[0]).toEqual({
      slug: 'alfa',
      title: 'Alfa',
      x: expect.any(Number),
      y: expect.any(Number),
    });
    expect(graph.nodes[0]).not.toHaveProperty('body');
    expect(graph.nodes[0]).not.toHaveProperty('vector');
    expect(JSON.stringify(graph)).not.toContain('fakt alfa');

    const bySlug = new Map(graph.nodes.map((node) => [node.slug, node]));
    const alfa = bySlug.get('alfa');
    const beta = bySlug.get('beta');
    const epsilon = bySlug.get('epsilon');
    expect(alfa).toBeDefined();
    expect(beta).toBeDefined();
    expect(epsilon).toBeDefined();
    expect(planeDistance(alfa!, beta!)).toBeLessThan(
      planeDistance(alfa!, epsilon!),
    );
    expect(
      graph.edges.some(
        (edge) => edge.source === 'alfa' && edge.target === 'beta',
      ),
    ).toBe(true);
    expect(
      graph.edges.some(
        (edge) =>
          (edge.source === 'alfa' && edge.target === 'epsilon') ||
          (edge.source === 'epsilon' && edge.target === 'alfa'),
      ),
    ).toBe(false);
    expect(buildContextSimilarityGraph(nodes, vectors)).toEqual(graph);
  });

  it('returns an empty map when no leaf has an embedding', () => {
    expect(buildContextSimilarityGraph(nodes, [])).toEqual({
      nodes: [],
      edges: [],
    });
  });
});
