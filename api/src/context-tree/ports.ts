import type { ContextLeafVector } from '../domain/context-leaf-search';
import type { ContextNode } from '../domain/context-tree';

export const CONTEXT_NODE_CATALOG = Symbol('CONTEXT_NODE_CATALOG');
export const TEXT_EMBEDDER = Symbol('TEXT_EMBEDDER');
export const CONTEXT_LEAF_VECTORS = Symbol('CONTEXT_LEAF_VECTORS');

export interface ContextNodeCatalog {
  list(): ContextNode[];
}

export interface TextEmbedder {
  embed(text: string): Promise<number[] | null> | number[] | null;
}

export interface ContextLeafVectorIndex {
  list(): Promise<ContextLeafVector[]> | ContextLeafVector[];
}
