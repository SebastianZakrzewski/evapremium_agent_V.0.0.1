import { CONTEXT_TREE_NODES } from './in-memory/context-tree-fixture';
import { InMemoryContextNodeCatalog } from './in-memory/in-memory-context-node-catalog';
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
});
