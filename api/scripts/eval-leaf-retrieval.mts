import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEAF_RETRIEVAL_EXTENDED_DATASET } from '../src/domain/leaf-retrieval-extended-dataset.ts';
import { runLeafRetrievalOfflineEval } from '../src/domain/run-leaf-retrieval-eval.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..', '..');

const report = runLeafRetrievalOfflineEval(LEAF_RETRIEVAL_EXTENDED_DATASET);

const summary = {
  generatedAt: report.generatedAt,
  methodNote: report.methodNote,
  indexSize: report.indexSize,
  caseCount: report.caseCount,
  overall: report.overall,
  faqOnly: report.faqOnly,
  faqMiss: {
    n: report.faqMiss.cosine.n,
    cosineHitAt1Rate: report.faqMiss.cosine.hitAt1Rate,
    hybridHitAt1Rate: report.faqMiss.hybrid.hitAt1Rate,
    falsePositiveRate: report.faqMiss.falsePositiveRate,
  },
  byIntent: report.byIntent,
  byBusinessArea: report.byBusinessArea,
};

const outSummary = join(
  repoRoot,
  'docs',
  'eval',
  'leaf-retrieval-extended-summary.json',
);
const outFull = join(
  repoRoot,
  'docs',
  'eval',
  'leaf-retrieval-extended-report.json',
);

writeFileSync(outSummary, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
writeFileSync(
  outFull,
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8',
);

console.log(JSON.stringify(summary, null, 2));
