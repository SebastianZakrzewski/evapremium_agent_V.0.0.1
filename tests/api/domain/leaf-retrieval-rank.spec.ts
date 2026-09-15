import { HYBRID_RETRIEVAL_TEXT_BY_SLUG } from '@api/context-tree/in-memory/hybrid-retrieval-fixture';
import {
  confidenceFromMargin,
  fuseRrf,
  hybridRankLeaves,
  lexicalRerank,
  rankBm25,
  tokenizeRetrieval,
} from '@api/domain/leaf-retrieval-rank';
import type { ContextNode } from '@api/domain/context-tree';

function leaf(slug: string, retrievalText: string): ContextNode {
  return {
    id: slug,
    parentId: null,
    slug,
    title: slug,
    body: 'body',
    retrievalText,
    sortOrder: 0,
    isActive: true,
  };
}

describe('leaf retrieval rank', () => {
  it('normalizes Polish diacritics in tokens', () => {
    expect(tokenizeRetrieval('Kiedy wyślecie zamówienie?')).toContain('wyslecie');
  });

  it('ranks dostawa above czas-produkcji for Q3 on BM25', () => {
    const docs = [
      {
        slug: 'dostawa',
        text: HYBRID_RETRIEVAL_TEXT_BY_SLUG.dostawa!,
      },
      {
        slug: 'czas-produkcji',
        text: HYBRID_RETRIEVAL_TEXT_BY_SLUG['czas-produkcji']!,
      },
    ];
    const ranked = rankBm25('Kiedy wyślecie zamówienie?', docs);
    expect(ranked[0]?.slug).toBe('dostawa');
  });

  it('fuses cosine and BM25 so dostawa leads Q3 pair', () => {
    const fused = fuseRrf(
      [
        [{ slug: 'czas-produkcji' }, { slug: 'dostawa' }],
        [{ slug: 'dostawa' }, { slug: 'czas-produkcji' }],
      ],
      60,
      10,
    );
    expect(fused[0]?.slug).toBe('dostawa');
  });

  it('marks ambiguous confidence on a narrow rerank margin', () => {
    expect(confidenceFromMargin(1, 0.99)).toBe('ambiguous');
    expect(confidenceFromMargin(3, 1)).toBe('high');
  });

  it('hybridRankLeaves puts dostawa first when cosine favors produkcja', () => {
    const nodes = [
      leaf('dostawa', HYBRID_RETRIEVAL_TEXT_BY_SLUG.dostawa!),
      leaf('czas-produkcji', HYBRID_RETRIEVAL_TEXT_BY_SLUG['czas-produkcji']!),
    ];
    const cosineHits = [
      { slug: 'czas-produkcji', score: 0.584 },
      { slug: 'dostawa', score: 0.55 },
    ];
    const hits = hybridRankLeaves(
      'Kiedy wyślecie zamówienie?',
      cosineHits,
      nodes,
    );
    expect(hits[0]?.slug).toBe('dostawa');
    expect(hits[0]?.confidence).toBeDefined();
    expect(hits[0]).not.toHaveProperty('body');
  });

  it('lexicalRerank prefers token overlap on the pool', () => {
    const ranked = lexicalRerank('gwarancja na dywaniki', [
      {
        slug: 'gwarancja',
        retrievalText: HYBRID_RETRIEVAL_TEXT_BY_SLUG.gwarancja!,
      },
      {
        slug: 'niedopasowanie-wymiana',
        retrievalText: HYBRID_RETRIEVAL_TEXT_BY_SLUG['niedopasowanie-wymiana']!,
      },
    ]);
    expect(ranked[0]?.slug).toBe('gwarancja');
  });
});
