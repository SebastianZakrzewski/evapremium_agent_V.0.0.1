import {
  lookupContextLeaf,
  type ContextLeafLookupResult,
} from '../domain/context-tree';
import type { ContextNodeCatalog } from './ports';

export class ContextTreeResolver {
  constructor(private readonly nodes: ContextNodeCatalog) {}

  lookupLeaf(slug: string): ContextLeafLookupResult {
    return lookupContextLeaf(slug, this.nodes.list());
  }
}
