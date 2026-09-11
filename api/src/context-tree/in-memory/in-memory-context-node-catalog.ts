import type { ContextNode } from '../../domain/context-tree';
import type { ContextNodeCatalog } from '../ports';

export class InMemoryContextNodeCatalog implements ContextNodeCatalog {
  constructor(private readonly nodes: ContextNode[]) {}

  list(): ContextNode[] {
    return this.nodes;
  }
}
