import { CONTEXT_TREE_NODES } from '@api/context-tree/in-memory/context-tree-fixture';
import {
  CONTEXT_LEAF_SEARCH_FIXTURE,
  CONTEXT_LEAF_SEARCH_QUERIES,
} from '@api/context-tree/in-memory/context-leaf-search-fixture';
import {
  CONTEXT_LEAF_SEARCH_THRESHOLD,
  CONTEXT_LEAF_SEARCH_TOP_K,
  searchContextLeaves,
} from '@api/domain/context-leaf-search';

function search(query: string) {
  const vector = CONTEXT_LEAF_SEARCH_QUERIES[query];
  if (vector === undefined) {
    throw new Error(`missing fixture vector for ${query}`);
  }
  return searchContextLeaves(
    vector,
    CONTEXT_LEAF_SEARCH_FIXTURE,
    CONTEXT_TREE_NODES,
    CONTEXT_LEAF_SEARCH_THRESHOLD,
    CONTEXT_LEAF_SEARCH_TOP_K,
  );
}

describe('context leaf search', () => {
  it('returns dostawa slug for a shipping paraphrase above threshold', () => {
    const matches = search('kiedy wyślecie dywaniki');
    expect(matches).toEqual([{ slug: 'dostawa', score: expect.any(Number) }]);
    expect(matches[0]?.score).toBeGreaterThanOrEqual(
      CONTEXT_LEAF_SEARCH_THRESHOLD,
    );
    expect(matches[0]).not.toHaveProperty('body');
  });

  it('returns empty for unknown topic, branch, inactive leaf, and empty body', () => {
    expect(search('jaki mam VIN')).toEqual([]);
    expect(search('informacje ogólne')).toEqual([]);
    expect(search('stara gwarancja')).toEqual([]);
    expect(search('zapis rozmowy')).toEqual([]);
  });

  it('caps results to topK after threshold filter', () => {
    const parentId = 'node-root-info';
    const nodes = [
      ...CONTEXT_TREE_NODES,
      {
        id: 'n-leaf-a',
        parentId,
        slug: 'leaf-a',
        title: 'A',
        body: 'a',
        sortOrder: 10,
        isActive: true,
      },
      {
        id: 'n-leaf-b',
        parentId,
        slug: 'leaf-b',
        title: 'B',
        body: 'b',
        sortOrder: 11,
        isActive: true,
      },
      {
        id: 'n-leaf-c',
        parentId,
        slug: 'leaf-c',
        title: 'C',
        body: 'c',
        sortOrder: 12,
        isActive: true,
      },
    ];
    const matches = searchContextLeaves(
      [1, 0, 0, 0],
      [
        { slug: 'leaf-a', vector: [1, 0, 0, 0] },
        { slug: 'leaf-b', vector: [0.9, 0.1, 0, 0] },
        { slug: 'leaf-c', vector: [0.8, 0.2, 0, 0] },
      ],
      nodes,
      0.5,
      2,
    );
    expect(matches.map((m) => m.slug)).toEqual(['leaf-a', 'leaf-b']);
  });
});
