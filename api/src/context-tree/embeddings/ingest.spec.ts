import { CONTEXT_TREE_NODES } from '../in-memory/context-tree-fixture';
import { MapTextEmbedder } from '../in-memory/map-text-embedder';
import { InMemoryContextLeafEmbeddings } from './in-memory-embeddings';
import { ingestContextLeafEmbeddings } from './ingest';

describe('ingestContextLeafEmbeddings', () => {
  it('upserts active leaves with body and overwrites the same slug', async () => {
    const store = new InMemoryContextLeafEmbeddings();
    const embedder = new MapTextEmbedder({
      'Dostawa\nWysyłka w 5–7 dni roboczych.': [1, 0, 0, 0],
    });
    await expect(
      ingestContextLeafEmbeddings(CONTEXT_TREE_NODES, embedder, store),
    ).resolves.toBe(1);
    await expect(store.list()).resolves.toEqual([
      { slug: 'dostawa', vector: [1, 0, 0, 0] },
    ]);
    const again = new MapTextEmbedder({
      'Dostawa\nWysyłka w 5–7 dni roboczych.': [0.5, 0.5, 0, 0],
    });
    await ingestContextLeafEmbeddings(CONTEXT_TREE_NODES, again, store);
    await expect(store.list()).resolves.toEqual([
      { slug: 'dostawa', vector: [0.5, 0.5, 0, 0] },
    ]);
  });
});
