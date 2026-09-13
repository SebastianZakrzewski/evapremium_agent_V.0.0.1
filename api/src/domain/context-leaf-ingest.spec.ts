import { CONTEXT_TREE_NODES } from '../context-tree/in-memory/context-tree-fixture';
import {
  eligibleLeavesForEmbedding,
  embeddingChunk,
} from './context-leaf-ingest';

describe('context leaf ingest eligibility', () => {
  it('keeps active leaves with body and skips branch, inactive, and empty legal seed', () => {
    const eligible = eligibleLeavesForEmbedding(CONTEXT_TREE_NODES);
    expect(eligible.map((node) => node.slug)).toEqual(['dostawa']);
    expect(embeddingChunk(eligible[0]!)).toContain('Wysyłka w 5–7 dni roboczych.');
  });
});
