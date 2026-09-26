import {
  lookupContextLeaf,
  type ContextLeafLookupResult,
} from '../domain/context-tree';
import {
  buildContextSimilarityGraph,
  type ContextSimilarityGraph,
} from '../domain/context-similarity-graph';
import {
  explainLeafRetrieval,
  type LeafRetrievalTrace,
} from '../domain/branch-retrieval';
import type { ContextLeafSearchHit } from '../domain/context-leaf-search';
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

  async searchLeaves(
    query: string,
    relatedBranches: readonly string[] = [],
  ): Promise<ContextLeafSearchHit[]> {
    return (await this.explainSearch(query, relatedBranches)).hits;
  }

  async explainSearch(
    query: string,
    relatedBranches: readonly string[] = [],
  ): Promise<{ hits: ContextLeafSearchHit[]; trace: LeafRetrievalTrace }> {
    const preferredBranches = [...relatedBranches];
    const empty: LeafRetrievalTrace = {
      preferredBranches,
      rankedBranches: [],
      leaves: [],
    };
    const queryVector = await this.embedder.embed(query);
    if (queryVector === null) {
      return { hits: [], trace: empty };
    }
    const index = await this.vectors.list();
    const nodes = this.nodes.list();
    return explainLeafRetrieval(
      query,
      queryVector,
      index,
      nodes,
      relatedBranches,
    );
  }

  async similarityGraph(): Promise<ContextSimilarityGraph> {
    return buildContextSimilarityGraph(
      this.nodes.list(),
      await this.vectors.list(),
    );
  }
}
