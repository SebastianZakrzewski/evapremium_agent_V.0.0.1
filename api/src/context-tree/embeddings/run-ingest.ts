import type { ContextNode } from '../../domain/context-tree';
import { CONTEXT_TREE_NODES } from '../in-memory/context-tree-fixture';
import type { TextEmbedder } from '../ports';
import { loadContextNodes } from '../supabase/load-nodes';
import { hasSupabaseEnv } from '../../supabase/env';
import { createSupabaseDataStore } from '../../supabase/supabase-data-store';
import { OpenAiTextEmbedder } from './openai-text-embedder';
import { createPostgresEmbeddingsSession } from './create-postgres-embeddings';
import { ingestContextLeafEmbeddings } from './ingest';
import type { ContextLeafEmbeddingStore } from './in-memory-embeddings';

export function leafIngestEnabled(env: NodeJS.Dict<string>): boolean {
  return Boolean(env.OPENAI_API_KEY?.trim() && env.DATABASE_URL?.trim());
}

export type LeafIngestDeps = {
  nodes?: ContextNode[];
  loadNodes?: () => Promise<ContextNode[]>;
  embedder?: TextEmbedder;
  store?: ContextLeafEmbeddingStore;
  ingest?: typeof ingestContextLeafEmbeddings;
};

async function catalogNodes(
  env: NodeJS.Dict<string>,
  loadNodes?: () => Promise<ContextNode[]>,
): Promise<ContextNode[]> {
  if (loadNodes) {
    return loadNodes();
  }
  if (hasSupabaseEnv(env as NodeJS.ProcessEnv)) {
    return loadContextNodes(createSupabaseDataStore());
  }
  return CONTEXT_TREE_NODES;
}

export async function runLeafIngest(
  env: NodeJS.Dict<string>,
  deps: LeafIngestDeps = {},
): Promise<{ written: number; skipped: boolean }> {
  if (!leafIngestEnabled(env)) {
    return { written: 0, skipped: true };
  }
  const apiKey = env.OPENAI_API_KEY?.trim() ?? '';
  const databaseUrl = env.DATABASE_URL?.trim() ?? '';
  const nodes = deps.nodes ?? (await catalogNodes(env, deps.loadNodes));
  const embedder = deps.embedder ?? new OpenAiTextEmbedder(apiKey);
  if (deps.store) {
    const written = await (deps.ingest ?? ingestContextLeafEmbeddings)(
      nodes,
      embedder,
      deps.store,
    );
    return { written, skipped: false };
  }
  const session = createPostgresEmbeddingsSession(databaseUrl);
  try {
    const written = await (deps.ingest ?? ingestContextLeafEmbeddings)(
      nodes,
      embedder,
      session.store,
    );
    return { written, skipped: false };
  } finally {
    await session.end();
  }
}
