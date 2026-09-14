import type { ContextLeafVector } from '../../domain/context-leaf-search';
import { parseVectorText } from '../embeddings/postgres-embeddings';
import type { DataStore } from '../../supabase/data-store';

type EmbeddingRow = {
  slug: string;
  embedding: unknown;
};

export function parseStoredEmbedding(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((part) => Number(part));
  }
  return parseVectorText(String(value ?? ''));
}

export async function loadContextLeafVectors(
  store: DataStore,
): Promise<ContextLeafVector[]> {
  const rows = await store.selectAll<EmbeddingRow>(
    'eva_bot',
    'context_node_embeddings',
  );
  return rows
    .filter((row) => typeof row.slug === 'string' && row.slug.trim() !== '')
    .map((row) => ({
      slug: row.slug,
      vector: parseStoredEmbedding(row.embedding),
    }))
    .filter(
      (row) =>
        row.vector.length > 0 && row.vector.every((value) => Number.isFinite(value)),
    );
}
