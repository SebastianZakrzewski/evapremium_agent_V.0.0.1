import type { ContextLeafVector } from '../../domain/context-leaf-search';
import type { ContextLeafVectorIndex } from '../ports';
import type { ContextLeafEmbeddingStore } from './in-memory-embeddings';

export class EmbeddingStoreVectors implements ContextLeafVectorIndex {
  constructor(private readonly store: ContextLeafEmbeddingStore) {}

  list(): Promise<ContextLeafVector[]> {
    return this.store.list();
  }
}
