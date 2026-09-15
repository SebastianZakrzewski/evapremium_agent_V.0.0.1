import { evalCorpusSlugSet } from '@api/domain/leaf-retrieval-eval-corpus';
import {
  LEAF_RETRIEVAL_EXTENDED_DATASET,
  buildExtendedLeafRetrievalDataset,
} from '@api/domain/leaf-retrieval-extended-dataset';
import { buildTfidfIndex } from '@api/domain/leaf-retrieval-tfidf-index';
import { runLeafRetrievalOfflineEval } from '@api/domain/run-leaf-retrieval-eval';
import { tokenizeRetrieval } from '@api/domain/leaf-retrieval-rank';

describe('extended leaf retrieval dataset', () => {
  it('has at least 100 cases across business areas', () => {
    const rows = buildExtendedLeafRetrievalDataset();
    expect(rows.length).toBeGreaterThanOrEqual(100);
    expect(rows.length).toBe(LEAF_RETRIEVAL_EXTENDED_DATASET.length);
    const ids = new Set(rows.map((row) => row.id));
    expect(ids.size).toBe(rows.length);
    const intents = new Set(rows.map((row) => row.intent));
    expect(intents.has('product_info')).toBe(true);
    expect(intents.has('delivery')).toBe(true);
    expect(intents.has('after_sales')).toBe(true);
    expect(intents.has('pricing')).toBe(true);
    expect(intents.has('out_of_scope')).toBe(true);
  });

  it('references only corpus slugs for FAQ gold', () => {
    const slugs = evalCorpusSlugSet();
    for (const row of LEAF_RETRIEVAL_EXTENDED_DATASET) {
      if (row.kind !== 'faq') {
        continue;
      }
      for (const slug of row.expectSlugs) {
        expect(slugs.has(slug)).toBe(true);
      }
    }
  });
});

describe('offline TF-IDF index', () => {
  it('tokenizes Polish diacritics consistently', () => {
    expect(tokenizeRetrieval('wysyłka')).toContain('wysylka');
  });

  it('builds one vector per document slug', () => {
    const index = buildTfidfIndex([
      { slug: 'a', text: 'wysylka kurier' },
      { slug: 'b', text: 'produkcja dni' },
    ]);
    expect(index.documentVectors).toHaveLength(2);
    expect(index.embed('wysylka').length).toBe(index.vocabulary.length);
  });
});

describe('extended leaf retrieval offline eval', () => {
  it('meets FAQ recall@K and collision hit@1 lift on offline proxy', () => {
    const report = runLeafRetrievalOfflineEval(LEAF_RETRIEVAL_EXTENDED_DATASET);
    expect(report.caseCount).toBeGreaterThanOrEqual(100);
    expect(report.indexSize).toBe(16);
    expect(report.faqOnly.cosine.recallAtKRate).toBeGreaterThanOrEqual(0.8);
    expect(report.faqOnly.hybrid.recallAtKRate).toBeGreaterThanOrEqual(0.8);

    const collisionCases = LEAF_RETRIEVAL_EXTENDED_DATASET.filter(
      (row) => row.kind === 'faq' && (row.hardNegatives?.length ?? 0) > 0,
    );
    expect(collisionCases.length).toBeGreaterThanOrEqual(20);
    const collision = runLeafRetrievalOfflineEval(collisionCases);
    expect(collision.faqOnly.hybrid.hitAt1Rate).toBeGreaterThan(
      collision.faqOnly.cosine.hitAt1Rate,
    );
  });

  it('reports miss false-positive rate for faq_miss', () => {
    const report = runLeafRetrievalOfflineEval(LEAF_RETRIEVAL_EXTENDED_DATASET);
    expect(report.faqMiss.cosine.n).toBeGreaterThanOrEqual(10);
    expect(report.faqMiss.falsePositiveRate).toBeDefined();
    expect(report.faqMiss.falsePositiveRate).toBeLessThanOrEqual(0.65);
  });
});
