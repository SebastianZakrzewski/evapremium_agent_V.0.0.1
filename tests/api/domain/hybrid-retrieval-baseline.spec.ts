import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodesForCalibrationSlugs } from '@api/context-tree/in-memory/hybrid-retrieval-fixture';
import {
  evaluateRanking,
  tallyRankingScores,
} from '@api/domain/leaf-retrieval-dataset';
import { hybridRankLeaves } from '@api/domain/leaf-retrieval-rank';

type BaselineCase = {
  id: string;
  query: string;
  expectSlugs: string[];
  raw_top5: Array<{ slug: string; score: number }>;
};

describe('hybrid retrieval vs cosine baseline', () => {
  it('beats baseline hit@1 on the seven-case calibration set', () => {
    const snapshotPath = join(
      __dirname,
      '../../../docs/eval/leaf-retrieval-cosine-baseline-2026-09-15.json',
    );
    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as {
      cases: BaselineCase[];
    };

    const allSlugs = snapshot.cases.flatMap((row) => [
      ...row.expectSlugs,
      ...row.raw_top5.map((hit) => hit.slug),
    ]);
    const nodes = nodesForCalibrationSlugs(allSlugs);

    const scores = snapshot.cases.map((row) => {
      const cosineHits = row.raw_top5.map((hit) => ({
        slug: hit.slug,
        score: hit.score,
      }));
      const ranked = hybridRankLeaves(row.query, cosineHits, nodes);
      return evaluateRanking(ranked, row.expectSlugs, 4);
    });

    const tally = tallyRankingScores(scores);
    expect(tally.n).toBe(7);
    expect(tally.recallAtKRate).toBe(1);
    expect(tally.hitAt1Rate).toBeGreaterThanOrEqual(6 / 7);

    const byId = new Map(
      snapshot.cases.map((row, index) => [row.id, scores[index]]),
    );
    expect(byId.get('Q3')?.hitAt1).toBe(true);
    expect(byId.get('Q5')?.hitAt1).toBe(true);
    expect(byId.get('Q6')?.hitAt1).toBe(true);
  });
});
