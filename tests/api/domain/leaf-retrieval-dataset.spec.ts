import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  evaluateRanking,
  LEAF_RETRIEVAL_DATASET,
  tallyRankingScores,
} from '@api/domain/leaf-retrieval-dataset';

function caseById(id: string) {
  const row = LEAF_RETRIEVAL_DATASET.find((entry) => entry.id === id);
  if (row === undefined) {
    throw new Error(`missing dataset case ${id}`);
  }
  return row;
}

describe('leaf retrieval gold dataset', () => {
  it('keeps calibration paraphrases Q3 Q5 Q6 with collision hard negatives', () => {
    const q3 = caseById('Q3');
    expect(q3.query).toBe('Kiedy wyślecie zamówienie?');
    expect(q3.expectSlugs).toEqual(['dostawa']);
    expect(q3.intent).toBe('delivery');
    expect(q3.hardNegatives).toContain('czas-produkcji');

    const q5 = caseById('Q5');
    expect(q5.expectSlugs).toEqual(['gwarancja']);
    expect(q5.hardNegatives).toContain('niedopasowanie-wymiana');

    const q6 = caseById('Q6');
    expect(q6.expectSlugs).toEqual(['niedopasowanie-wymiana']);
    expect(q6.hardNegatives).toContain('dopasowanie-model');
  });

  it('scores hit@1 recall@K and wrong_top on Q3 cosine-style rankings', () => {
    const gold = caseById('Q3').expectSlugs;
    const wrongTop = evaluateRanking(
      [{ slug: 'czas-produkcji' }, { slug: 'dostawa' }],
      gold,
    );
    expect(wrongTop).toEqual({
      hitAt1: false,
      recallAtK: true,
      wrongTop: true,
    });

    const ideal = evaluateRanking(
      [{ slug: 'dostawa' }, { slug: 'czas-produkcji' }],
      gold,
    );
    expect(ideal).toEqual({
      hitAt1: true,
      recallAtK: true,
      wrongTop: false,
    });
  });

  it('treats empty ranking as success only for faq_miss gold', () => {
    expect(evaluateRanking([], caseById('M1').expectSlugs)).toEqual({
      hitAt1: true,
      recallAtK: true,
      wrongTop: false,
    });
    expect(
      evaluateRanking([{ slug: 'gwarancja' }], caseById('M1').expectSlugs),
    ).toEqual({
      hitAt1: false,
      recallAtK: false,
      wrongTop: true,
    });
  });

  it('locks cosine-only 2026-09-15 baseline at hit@1 4/7 and recall 7/7', () => {
    const snapshotPath = join(
      __dirname,
      '../../../docs/eval/leaf-retrieval-cosine-baseline-2026-09-15.json',
    );
    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as {
      cases: Array<{
        expectSlugs: string[];
        raw_top5: Array<{ slug: string }>;
      }>;
    };
    const scores = snapshot.cases.map((row) =>
      evaluateRanking(row.raw_top5, row.expectSlugs, 4),
    );
    expect(tallyRankingScores(scores)).toEqual({
      n: 7,
      hitAt1Rate: 4 / 7,
      recallAtKRate: 1,
      wrongTopRate: 3 / 7,
    });
  });
});
