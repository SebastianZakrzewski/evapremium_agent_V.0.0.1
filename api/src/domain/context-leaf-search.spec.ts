import { CONTEXT_TREE_NODES } from '../context-tree/in-memory/context-tree-fixture';
import {
  CONTEXT_LEAF_SEARCH_FIXTURE,
  CONTEXT_LEAF_SEARCH_QUERIES,
} from '../context-tree/in-memory/context-leaf-search-fixture';
import { searchContextLeaves } from './context-leaf-search';

const threshold = 0.8;

function search(query: string) {
  const vector = CONTEXT_LEAF_SEARCH_QUERIES[query];
  if (vector === undefined) {
    throw new Error(`missing fixture vector for ${query}`);
  }
  return searchContextLeaves(
    vector,
    CONTEXT_LEAF_SEARCH_FIXTURE,
    CONTEXT_TREE_NODES,
    threshold,
  );
}

describe('context leaf search', () => {
  it('returns dostawa slug for a shipping paraphrase above threshold', () => {
    const matches = search('kiedy wyślecie dywaniki');
    expect(matches).toEqual([{ slug: 'dostawa', score: expect.any(Number) }]);
    expect(matches[0]?.score).toBeGreaterThanOrEqual(threshold);
    expect(matches[0]).not.toHaveProperty('body');
  });

  it('returns empty for unknown topic, branch, inactive leaf, and empty body', () => {
    expect(search('jaki mam VIN')).toEqual([]);
    expect(search('informacje ogólne')).toEqual([]);
    expect(search('stara gwarancja')).toEqual([]);
    expect(search('zapis rozmowy')).toEqual([]);
  });
});
