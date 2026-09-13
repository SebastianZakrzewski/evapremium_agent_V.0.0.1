import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  CONTEXT_LEAF_VECTORS,
  CONTEXT_NODE_CATALOG,
  TEXT_EMBEDDER,
  type ContextLeafVectorIndex,
  type ContextNodeCatalog,
  type TextEmbedder,
} from './ports';
import { ContextTreeResolver } from './context-tree.resolver';
import { NullTextEmbedder } from './in-memory/null-text-embedder';
import { InMemoryContextLeafVectors } from './in-memory/in-memory-context-leaf-vectors';

@Injectable()
export class ContextTreeService extends ContextTreeResolver {
  constructor(
    @Inject(CONTEXT_NODE_CATALOG) nodes: ContextNodeCatalog,
    @Optional() @Inject(TEXT_EMBEDDER) embedder?: TextEmbedder,
    @Optional() @Inject(CONTEXT_LEAF_VECTORS) vectors?: ContextLeafVectorIndex,
  ) {
    super(
      nodes,
      embedder ?? new NullTextEmbedder(),
      vectors ?? new InMemoryContextLeafVectors([]),
    );
  }
}
