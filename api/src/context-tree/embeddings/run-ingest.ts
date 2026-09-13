import type { ContextNode } from '../../domain/context-tree';
import { CONTEXT_TREE_NODES } from '../in-memory/context-tree-fixture';
import type { TextEmbedder } from '../ports';
import { OpenAiTextEmbedder } from './openai-text-embedder';
import { createPostgresContextLeafEmbeddings } from './create-postgres-embeddings';
import { ingestContextLeafEmbeddings } from './ingest';
import type { ContextLeafEmbeddingStore } from './in-memory-embeddings';

export function leafIngestEnabled(env: NodeJS.Dict<string>): boolean {
  return Boolean(env.OPENAI_API_KEY?.trim() && env.DATABASE_URL?.trim());
}

export type LeafIngestDeps = {
  nodes?: ContextNode[];
  embedder?: TextEmbedder;
  store?: ContextLeafEmbeddingStore;
  ingest?: typeof ingestContextLeafEmbeddings;
};

export async function runLeafIngest(
  env: NodeJS.Dict<string>,
  deps: LeafIngestDeps = {},
): Promise<{ written: number; skipped: boolean }> {
  if (!leafIngestEnabled(env)) {
    return { written: 0, skipped: true };
  }
  const apiKey = env.OPENAI_API_KEY?.trim() ?? '';
  const databaseUrl = env.DATABASE_URL?.trim() ?? '';
  const nodes = deps.nodes ?? CONTEXT_TREE_NODES;
  const embedder = deps.embedder ?? new OpenAiTextEmbedder(apiKey);
  const store =
    deps.store ?? createPostgresContextLeafEmbeddings(databaseUrl);
  const ingest = deps.ingest ?? ingestContextLeafEmbeddings;
  const written = await ingest(nodes, embedder, store);
  return { written, skipped: false };
}
