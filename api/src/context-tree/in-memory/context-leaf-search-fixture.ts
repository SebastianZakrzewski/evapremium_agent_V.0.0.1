import type { ContextLeafVector } from '../../domain/context-leaf-search';

/** Hand vectors for Slice 1; production embeddings are 1536-d in Slice 3. */
export const CONTEXT_LEAF_SEARCH_FIXTURE: ContextLeafVector[] = [
  { slug: 'dostawa', vector: [1, 0, 0, 0] },
  { slug: 'info', vector: [0, 1, 0, 0] },
  { slug: 'archiwum-gwarancja', vector: [0, 0, 1, 0] },
  { slug: 'chat-zapis', vector: [0, 0, 0, 1] },
];

export const CONTEXT_LEAF_SEARCH_QUERIES: Record<string, number[]> = {
  'kiedy wyślecie dywaniki': [0.98, 0.1, 0, 0],
  'jaki mam VIN': [0, 0, 0, 0],
  'informacje ogólne': [0, 1, 0, 0],
  'stara gwarancja': [0, 0, 1, 0],
  'zapis rozmowy': [0, 0, 0, 1],
};
