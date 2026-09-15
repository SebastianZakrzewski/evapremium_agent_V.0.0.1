import { CONTEXT_TREE_NODES } from '@api/context-tree/in-memory/context-tree-fixture';
import {
  HYBRID_RETRIEVAL_TEXT_BY_SLUG,
  withHybridRetrievalText,
} from '@api/context-tree/in-memory/hybrid-retrieval-fixture';
import { InMemoryContextNodeCatalog } from '@api/context-tree/in-memory/in-memory-context-node-catalog';
import {
  CONTEXT_LEAF_SEARCH_FIXTURE,
  CONTEXT_LEAF_SEARCH_QUERIES,
} from '@api/context-tree/in-memory/context-leaf-search-fixture';
import { InMemoryContextLeafVectors } from '@api/context-tree/in-memory/in-memory-context-leaf-vectors';
import { MapTextEmbedder } from '@api/context-tree/in-memory/map-text-embedder';
import { NullTextEmbedder } from '@api/context-tree/in-memory/null-text-embedder';
import { ContextTreeResolver } from '@api/context-tree/context-tree.resolver';

describe('ContextTreeResolver', () => {
  const resolver = new ContextTreeResolver(
    new InMemoryContextNodeCatalog(CONTEXT_TREE_NODES),
  );

  it('returns leaf body through in-memory catalogs', () => {
    expect(resolver.lookupLeaf('dostawa')).toEqual({
      status: 'hit',
      slug: 'dostawa',
      title: 'Dostawa',
      body: 'Wysyłka w 5–7 dni roboczych.',
    });
  });

  it('returns miss for unknown and branch slugs from the same catalog', () => {
    expect(resolver.lookupLeaf('pielegnacja')).toEqual({ status: 'miss' });
    expect(resolver.lookupLeaf('info')).toEqual({ status: 'miss' });
  });

  it('returns dostawa slug through stub embedder and in-memory vectors', async () => {
    const searching = new ContextTreeResolver(
      new InMemoryContextNodeCatalog(CONTEXT_TREE_NODES),
      new MapTextEmbedder(CONTEXT_LEAF_SEARCH_QUERIES),
      new InMemoryContextLeafVectors(CONTEXT_LEAF_SEARCH_FIXTURE),
    );
    const matches = await searching.searchLeaves('kiedy wyślecie dywaniki');
    expect(matches).toEqual([
      {
        slug: 'dostawa',
        score: expect.any(Number),
        confidence: 'high',
      },
    ]);
    expect(matches[0]).not.toHaveProperty('body');
  });

  it('ranks dostawa first for Q3 when hybrid retrieval_text disambiguates', async () => {
    const nodes = withHybridRetrievalText([
      ...CONTEXT_TREE_NODES,
      {
        id: 'node-czas',
        parentId: 'node-root-info',
        slug: 'czas-produkcji',
        title: 'Czas produkcji',
        body: 'Szycie trwa kilka dni.',
        retrievalText: HYBRID_RETRIEVAL_TEXT_BY_SLUG['czas-produkcji'],
        sortOrder: 2,
        isActive: true,
      },
    ]);
    const searching = new ContextTreeResolver(
      new InMemoryContextNodeCatalog(nodes),
      new MapTextEmbedder({
        'Kiedy wyślecie zamówienie?': [0.9, 0.1, 0, 0],
        'kiedy wyślecie dywaniki': [1, 0, 0, 0],
      }),
      new InMemoryContextLeafVectors([
        { slug: 'czas-produkcji', vector: [0.9, 0.1, 0, 0] },
        { slug: 'dostawa', vector: [0.85, 0.15, 0, 0] },
      ]),
    );
    const matches = await searching.searchLeaves('Kiedy wyślecie zamówienie?');
    expect(matches[0]?.slug).toBe('dostawa');
  });

  it('returns empty when embedder is missing', async () => {
    const searching = new ContextTreeResolver(
      new InMemoryContextNodeCatalog(CONTEXT_TREE_NODES),
      new NullTextEmbedder(),
      new InMemoryContextLeafVectors(CONTEXT_LEAF_SEARCH_FIXTURE),
    );
    expect(await searching.searchLeaves('kiedy wyślecie dywaniki')).toEqual([]);
  });
});
