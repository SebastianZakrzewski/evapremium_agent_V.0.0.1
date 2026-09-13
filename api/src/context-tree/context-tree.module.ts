import { Module } from '@nestjs/common';
import { CONTEXT_TREE_NODES } from './in-memory/context-tree-fixture';
import { InMemoryContextNodeCatalog } from './in-memory/in-memory-context-node-catalog';
import { CONTEXT_LEAF_SEARCH_FIXTURE } from './in-memory/context-leaf-search-fixture';
import { InMemoryContextLeafVectors } from './in-memory/in-memory-context-leaf-vectors';
import { NullTextEmbedder } from './in-memory/null-text-embedder';
import {
  CONTEXT_LEAF_VECTORS,
  CONTEXT_NODE_CATALOG,
  TEXT_EMBEDDER,
} from './ports';
import { ContextTreeService } from './context-tree.service';
import type { DataStore } from '../supabase/data-store';
import { DATA_STORE, SupabaseModule } from '../supabase/supabase.module';
import { loadContextNodes } from './supabase/load-nodes';
import { createPostgresContextLeafEmbeddings } from './embeddings/create-postgres-embeddings';
import { EmbeddingStoreVectors } from './embeddings/store-vectors';
import { OpenAiTextEmbedder } from './embeddings/openai-text-embedder';

@Module({
  imports: [SupabaseModule],
  providers: [
    {
      provide: CONTEXT_NODE_CATALOG,
      useFactory: async (store: DataStore | undefined) =>
        new InMemoryContextNodeCatalog(
          store ? await loadContextNodes(store) : CONTEXT_TREE_NODES,
        ),
      inject: [DATA_STORE],
    },
    {
      provide: TEXT_EMBEDDER,
      useFactory: () => {
        const apiKey = process.env.OPENAI_API_KEY?.trim();
        return apiKey
          ? new OpenAiTextEmbedder(apiKey)
          : new NullTextEmbedder();
      },
    },
    {
      provide: CONTEXT_LEAF_VECTORS,
      useFactory: () => {
        const databaseUrl = process.env.DATABASE_URL?.trim();
        if (databaseUrl) {
          return new EmbeddingStoreVectors(
            createPostgresContextLeafEmbeddings(databaseUrl),
          );
        }
        return new InMemoryContextLeafVectors(CONTEXT_LEAF_SEARCH_FIXTURE);
      },
    },
    ContextTreeService,
  ],
  exports: [ContextTreeService],
})
export class ContextTreeModule {}
