import {
  applySoftBoost,
  hierarchicalSearchLeaves,
  rankBranches,
} from '@api/domain/branch-retrieval';
import type { ContextNode } from '@api/domain/context-tree';
import { evaluateRanking } from '@api/domain/leaf-retrieval-dataset';
import { hybridSearchLeaves } from '@api/domain/leaf-retrieval-rank';

function node(
  partial: Pick<ContextNode, 'id' | 'parentId' | 'slug' | 'title'> & {
    retrievalText: string;
  },
): ContextNode {
  return {
    body: '',
    sortOrder: 0,
    isActive: true,
    ...partial,
  };
}

describe('branch retrieval', () => {
  it('boosts a close branch without overriding a wide score gap', () => {
    expect(
      applySoftBoost(
        [
          { slug: 'material', score: 0.2 },
          { slug: 'kolory', score: 0.05 },
        ],
        ['kolory'],
      )[0]?.slug,
    ).toBe('material');

    expect(
      applySoftBoost(
        [
          { slug: 'material', score: 0.1 },
          { slug: 'kolory', score: 0.09 },
        ],
        ['kolory'],
      )[0]?.slug,
    ).toBe('kolory');
  });

  it('ranks the colors branch and leaf first for a color question', () => {
    const nodes = [
      node({
        id: 'b-kolory',
        parentId: null,
        slug: 'kolory',
        title: 'Kolory',
        retrievalText: 'kolory barwy',
      }),
      node({
        id: 'b-material',
        parentId: null,
        slug: 'material',
        title: 'Material',
        retrievalText: 'material eva',
      }),
      node({
        id: 'l-kolory',
        parentId: 'b-kolory',
        slug: 'kolory-oferta',
        title: 'Kolory oferty',
        retrievalText: 'kolory barwy oferta',
      }),
      node({
        id: 'l-material',
        parentId: 'b-material',
        slug: 'material-eva',
        title: 'Material EVA',
        retrievalText: 'material eva struktura',
      }),
    ];
    const index = [
      { slug: 'kolory', vector: [1, 0] },
      { slug: 'material', vector: [0.2, 1] },
      { slug: 'kolory-oferta', vector: [1, 0] },
      { slug: 'material-eva', vector: [0, 1] },
    ];
    const query = 'jakie kolory';
    const queryVector = [1, 0];
    const branches = rankBranches(query, queryVector, [
      { slug: 'kolory', text: 'kolory barwy', vector: [1, 0] },
      { slug: 'material', text: 'material eva', vector: [0.2, 1] },
    ]);
    const branchScores = evaluateRanking(branches, ['kolory'], 2);
    expect(branchScores.hitAt1).toBe(true);
    expect(branchScores.recallAtK).toBe(true);
    expect(branches.map((row) => row.slug)).toContain('material');

    const leaves = hierarchicalSearchLeaves(
      query,
      queryVector,
      index,
      nodes,
      ['kolory'],
    );
    const leafScores = evaluateRanking(leaves, ['kolory-oferta'], 3);
    expect(leafScores.hitAt1).toBe(true);

    const plain = hybridSearchLeaves(query, queryVector, index, nodes);
    expect(
      hierarchicalSearchLeaves(query, queryVector, index, nodes, []).map(
        (row) => row.slug,
      ),
    ).toEqual(plain.map((row) => row.slug));
  });
});
