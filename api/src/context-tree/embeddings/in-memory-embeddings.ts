import type { ContextLeafVector } from '../../domain/context-leaf-search';

export type EmbeddingUpsert = {
  slug: string;
  chunk: string;
  embedding: number[];
};

export interface ContextLeafEmbeddingStore {
  upsert(row: EmbeddingUpsert): Promise<void>;
  list(): Promise<ContextLeafVector[]>;
}

export class InMemoryContextLeafEmbeddings implements ContextLeafEmbeddingStore {
  constructor(private readonly rows = new Map<string, EmbeddingUpsert>()) {}

  async upsert(row: EmbeddingUpsert): Promise<void> {
    this.rows.set(row.slug, { ...row });
  }

  async list(): Promise<ContextLeafVector[]> {
    return [...this.rows.values()].map((row) => ({
      slug: row.slug,
      vector: row.embedding,
    }));
  }
}
