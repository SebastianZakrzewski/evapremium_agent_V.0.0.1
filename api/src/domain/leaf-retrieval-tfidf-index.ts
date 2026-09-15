import type { ContextLeafVector } from './context-leaf-search';
import { tokenizeRetrieval } from './leaf-retrieval-rank';

export type TfidfIndex = {
  vocabulary: string[];
  idf: number[];
  documentVectors: ContextLeafVector[];
  embed: (text: string) => number[];
};

function l2Normalize(vector: number[]): number[] {
  let sum = 0;
  for (const x of vector) {
    sum += x * x;
  }
  const denom = Math.sqrt(sum);
  if (denom === 0) {
    return vector.map(() => 0);
  }
  return vector.map((x) => x / denom);
}

/** Offline proxy for OpenAI embeddings — same cosine + hybrid pipeline in verify. */
export function buildTfidfIndex(
  documents: Array<{ slug: string; text: string }>,
): TfidfIndex {
  const tokenized = documents.map((doc) => ({
    slug: doc.slug,
    tokens: tokenizeRetrieval(doc.text),
  }));
  const df = new Map<string, number>();
  for (const row of tokenized) {
    const seen = new Set<string>();
    for (const token of row.tokens) {
      if (!seen.has(token)) {
        seen.add(token);
        df.set(token, (df.get(token) ?? 0) + 1);
      }
    }
  }
  const vocabulary = [...df.keys()].sort();
  const n = documents.length;
  const idf = vocabulary.map((term) => {
    const docFreq = df.get(term) ?? 0;
    return Math.log(1 + (n - docFreq + 0.5) / (docFreq + 0.5));
  });

  const embedTokens = (tokens: string[]): number[] => {
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }
    const len = tokens.length || 1;
    const raw = vocabulary.map((term, i) => {
      const freq = (tf.get(term) ?? 0) / len;
      return freq * (idf[i] ?? 0);
    });
    return l2Normalize(raw);
  };

  const documentVectors: ContextLeafVector[] = tokenized.map((row) => ({
    slug: row.slug,
    vector: embedTokens(row.tokens),
  }));

  return {
    vocabulary,
    idf,
    documentVectors,
    embed: (text: string) => embedTokens(tokenizeRetrieval(text)),
  };
}
