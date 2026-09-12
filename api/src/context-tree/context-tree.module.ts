import { Module } from '@nestjs/common';
import { CONTEXT_TREE_NODES } from './in-memory/context-tree-fixture';
import { InMemoryContextNodeCatalog } from './in-memory/in-memory-context-node-catalog';
import { CONTEXT_NODE_CATALOG } from './ports';
import { ContextTreeService } from './context-tree.service';
import type { DataStore } from '../supabase/data-store';
import { DATA_STORE, SupabaseModule } from '../supabase/supabase.module';
import { loadContextNodes } from './supabase/load-nodes';

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
    ContextTreeService,
  ],
  exports: [ContextTreeService],
})
export class ContextTreeModule {}
