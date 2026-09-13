import type { ContextLeafVector } from '../../domain/context-leaf-search';
import type { ContextLeafVectorIndex } from '../ports';

export class InMemoryContextLeafVectors implements ContextLeafVectorIndex {
  constructor(private readonly vectors: ContextLeafVector[]) {}

  list(): ContextLeafVector[] {
    return this.vectors;
  }
}
