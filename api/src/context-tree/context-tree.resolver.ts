import {
  lookupContextLeaf,
  type ContextLeafLookupResult,
} from '../domain/context-tree';
import {
  CONTEXT_LEAF_SEARCH_THRESHOLD,
  CONTEXT_LEAF_SEARCH_TOP_K,
  searchContextLeaves,
  type ContextLeafSearchHit,
} from '../domain/context-leaf-search';
import type {
  ContextLeafVectorIndex,
  ContextNodeCatalog,
  TextEmbedder,
} from './ports';
import { NullTextEmbedder } from './in-memory/null-text-embedder';
import { InMemoryContextLeafVectors } from './in-memory/in-memory-context-leaf-vectors';

export class ContextTreeResolver {
  constructor(
    private readonly nodes: ContextNodeCatalog,
    private readonly embedder: TextEmbedder = new NullTextEmbedder(),
    private readonly vectors: ContextLeafVectorIndex = new InMemoryContextLeafVectors(
      [],
    ),
  ) {}

  lookupLeaf(slug: string): ContextLeafLookupResult {
    return lookupContextLeaf(slug, this.nodes.list());
  }

  async searchLeaves(query: string): Promise<ContextLeafSearchHit[]> {
    const queryVector = await this.embedder.embed(query);
    if (queryVector === null) {
      return [];
    }
    return searchContextLeaves(
      queryVector,
      await this.vectors.list(),
      this.nodes.list(),
      CONTEXT_LEAF_SEARCH_THRESHOLD,
      CONTEXT_LEAF_SEARCH_TOP_K,
    );
  }
}
