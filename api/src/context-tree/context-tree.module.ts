import { Module } from '@nestjs/common';
import { CONTEXT_TREE_NODES } from './in-memory/context-tree-fixture';
import { InMemoryContextNodeCatalog } from './in-memory/in-memory-context-node-catalog';
import { CONTEXT_NODE_CATALOG } from './ports';
import { ContextTreeService } from './context-tree.service';

@Module({
  providers: [
    {
      provide: CONTEXT_NODE_CATALOG,
      useFactory: () => new InMemoryContextNodeCatalog(CONTEXT_TREE_NODES),
    },
    ContextTreeService,
  ],
  exports: [ContextTreeService],
})
export class ContextTreeModule {}
