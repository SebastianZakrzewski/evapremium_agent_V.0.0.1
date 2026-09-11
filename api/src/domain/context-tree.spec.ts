import { CONTEXT_TREE_NODES } from '../context-tree/in-memory/context-tree-fixture';
import { lookupContextLeaf } from './context-tree';

describe('context tree', () => {
  it('returns leaf body for a known slug', () => {
    expect(lookupContextLeaf('dostawa', CONTEXT_TREE_NODES)).toEqual({
      status: 'hit',
      slug: 'dostawa',
      title: 'Dostawa',
      body: 'Wysyłka w 5–7 dni roboczych.',
    });
  });

  it('returns a hit with empty body for seeded legal leaves', () => {
    expect(lookupContextLeaf('chat-zapis', CONTEXT_TREE_NODES)).toEqual({
      status: 'hit',
      slug: 'chat-zapis',
      title: 'Zapis rozmowy',
      body: '',
    });
    expect(lookupContextLeaf('zgoda-lead', CONTEXT_TREE_NODES)).toEqual({
      status: 'hit',
      slug: 'zgoda-lead',
      title: 'Zgoda na kontakt',
      body: '',
    });
  });

  it('returns miss for an unknown slug without inventing copy', () => {
    const result = lookupContextLeaf('pielegnacja', CONTEXT_TREE_NODES);
    expect(result).toEqual({ status: 'miss' });
    expect(result).not.toHaveProperty('body');
  });

  it('returns miss for a branch slug and for an inactive leaf', () => {
    expect(lookupContextLeaf('info', CONTEXT_TREE_NODES)).toEqual({
      status: 'miss',
    });
    expect(lookupContextLeaf('archiwum-gwarancja', CONTEXT_TREE_NODES)).toEqual({
      status: 'miss',
    });
  });
});
