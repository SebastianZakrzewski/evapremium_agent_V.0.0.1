import type { ContextNode } from '../domain/context-tree';

export const CONTEXT_NODE_CATALOG = Symbol('CONTEXT_NODE_CATALOG');

export interface ContextNodeCatalog {
  list(): ContextNode[];
}
