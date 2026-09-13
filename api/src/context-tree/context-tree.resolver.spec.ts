import { CONTEXT_TREE_NODES } from './in-memory/context-tree-fixture';
import { InMemoryContextNodeCatalog } from './in-memory/in-memory-context-node-catalog';
import {
  CONTEXT_LEAF_SEARCH_FIXTURE,
  CONTEXT_LEAF_SEARCH_QUERIES,
} from './in-memory/context-leaf-search-fixture';
import { InMemoryContextLeafVectors } from './in-memory/in-memory-context-leaf-vectors';
import { MapTextEmbedder } from './in-memory/map-text-embedder';
import { NullTextEmbedder } from './in-memory/null-text-embedder';
import { ContextTreeResolver } from './context-tree.resolver';

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

  it('returns dostawa slug through stub embedder and in-memory vectors', () => {
    const searching = new ContextTreeResolver(
      new InMemoryContextNodeCatalog(CONTEXT_TREE_NODES),
      new MapTextEmbedder(CONTEXT_LEAF_SEARCH_QUERIES),
      new InMemoryContextLeafVectors(CONTEXT_LEAF_SEARCH_FIXTURE),
    );
    const matches = searching.searchLeaves('kiedy wyślecie dywaniki');
    expect(matches).toEqual([{ slug: 'dostawa', score: expect.any(Number) }]);
    expect(matches[0]).not.toHaveProperty('body');
  });

  it('returns empty when embedder is missing', () => {
    const searching = new ContextTreeResolver(
      new InMemoryContextNodeCatalog(CONTEXT_TREE_NODES),
      new NullTextEmbedder(),
      new InMemoryContextLeafVectors(CONTEXT_LEAF_SEARCH_FIXTURE),
    );
    expect(searching.searchLeaves('kiedy wyślecie dywaniki')).toEqual([]);
  });
});
