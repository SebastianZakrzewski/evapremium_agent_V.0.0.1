import type { LeafRetrievalIntent } from './leaf-retrieval-dataset';
import { LEAF_RETRIEVAL_DATASET } from './leaf-retrieval-dataset';

const FEW_SHOT_CASE_IDS: Partial<Record<LeafRetrievalIntent, string[]>> = {
  delivery: ['Q3', 'Q4', 'chip-delivery'],
  after_sales: ['Q5', 'Q2', 'Q6'],
  product_info: ['Q1', 'Q-kolory', 'chip-materials'],
};

export function fewShotLinesForIntent(intent: LeafRetrievalIntent): string[] {
  const ids = FEW_SHOT_CASE_IDS[intent];
  if (ids === undefined) {
    return [];
  }
  const lines: string[] = [];
  for (const id of ids) {
    const row = LEAF_RETRIEVAL_DATASET.find((entry) => entry.id === id);
    if (row === undefined || row.expectSlugs.length === 0) {
      continue;
    }
    const slugs = row.expectSlugs.join(' lub ');
    const neg = row.hardNegatives?.[0];
    const negHint = neg ? ` (nie ${neg})` : '';
    lines.push(`„${row.query}” → slug ${slugs}${negHint}.`);
    if (lines.length >= 4) {
      break;
    }
  }
  return lines;
}
