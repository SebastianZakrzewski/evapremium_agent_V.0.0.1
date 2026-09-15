import { CONTEXT_TREE_NODES } from '@api/context-tree/in-memory/context-tree-fixture';
import { HYBRID_RETRIEVAL_TEXT_BY_SLUG } from '@api/context-tree/in-memory/hybrid-retrieval-fixture';
import type { ContextNode } from '@api/domain/context-tree';
import {
  eligibleLeavesForEmbedding,
  embeddingChunk,
  retrievalTextForSearch,
} from '@api/domain/context-leaf-ingest';

describe('context leaf ingest eligibility', () => {
  it('keeps active leaves with body and skips branch, inactive, and empty legal seed', () => {
    const eligible = eligibleLeavesForEmbedding(CONTEXT_TREE_NODES);
    expect(eligible.map((node) => node.slug)).toEqual(['dostawa']);
    expect(embeddingChunk(eligible[0]!)).toContain('Wysyłka w 5–7 dni roboczych.');
  });

  it('uses retrievalText for embedding chunk when set', () => {
    const dostawa: ContextNode = {
      ...CONTEXT_TREE_NODES.find((n) => n.slug === 'dostawa')!,
      retrievalText: HYBRID_RETRIEVAL_TEXT_BY_SLUG.dostawa,
    };
    const produkcja: ContextNode = {
      id: 'p1',
      parentId: null,
      slug: 'czas-produkcji',
      title: 'Czas produkcji',
      body: 'Szycie trwa kilka dni.',
      retrievalText: HYBRID_RETRIEVAL_TEXT_BY_SLUG['czas-produkcji'],
      sortOrder: 1,
      isActive: true,
    };
    expect(retrievalTextForSearch(dostawa)).not.toEqual(
      retrievalTextForSearch(produkcja),
    );
    expect(embeddingChunk(dostawa)).toContain('wysyłka');
    expect(embeddingChunk(produkcja)).toContain('szycia');
  });
});
