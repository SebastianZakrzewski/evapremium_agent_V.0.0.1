import type { ContextNode } from '../../domain/context-tree';
import {
  eligibleLeavesForEmbedding,
  embeddingChunk,
} from '../../domain/context-leaf-ingest';
import type { TextEmbedder } from '../ports';
import type { ContextLeafEmbeddingStore } from './in-memory-embeddings';

export async function ingestContextLeafEmbeddings(
  nodes: ContextNode[],
  embedder: TextEmbedder,
  store: ContextLeafEmbeddingStore,
): Promise<number> {
  let written = 0;
  for (const node of eligibleLeavesForEmbedding(nodes)) {
    const embedding = await embedder.embed(embeddingChunk(node));
    if (embedding === null) {
      continue;
    }
    await store.upsert({
      slug: node.slug,
      chunk: embeddingChunk(node),
      embedding,
    });
    written += 1;
  }
  return written;
}
