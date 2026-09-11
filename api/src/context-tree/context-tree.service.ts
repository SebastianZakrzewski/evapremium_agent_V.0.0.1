import { Inject, Injectable } from '@nestjs/common';
import { CONTEXT_NODE_CATALOG, type ContextNodeCatalog } from './ports';
import { ContextTreeResolver } from './context-tree.resolver';

@Injectable()
export class ContextTreeService extends ContextTreeResolver {
  constructor(@Inject(CONTEXT_NODE_CATALOG) nodes: ContextNodeCatalog) {
    super(nodes);
  }
}
