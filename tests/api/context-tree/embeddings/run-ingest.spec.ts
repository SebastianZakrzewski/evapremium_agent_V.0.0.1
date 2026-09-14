import { CONTEXT_TREE_NODES } from '@api/context-tree/in-memory/context-tree-fixture';
import { MapTextEmbedder } from '@api/context-tree/in-memory/map-text-embedder';
import { InMemoryContextLeafEmbeddings } from '@api/context-tree/embeddings/in-memory-embeddings';
import { leafIngestEnabled, runLeafIngest } from '@api/context-tree/embeddings/run-ingest';

describe('runLeafIngest', () => {
  it('skips when embedder or database env is missing', async () => {
    expect(leafIngestEnabled({})).toBe(false);
    await expect(runLeafIngest({})).resolves.toEqual({
      written: 0,
      skipped: true,
    });
  });

  it('ingests fixture leaves when env and store are provided', async () => {
    const store = new InMemoryContextLeafEmbeddings();
    const result = await runLeafIngest(
      { OPENAI_API_KEY: 'sk-test', DATABASE_URL: 'postgres://local' },
      {
        nodes: CONTEXT_TREE_NODES,
        embedder: new MapTextEmbedder({
          'Dostawa\nWysyłka w 5–7 dni roboczych.': [1, 0, 0, 0],
        }),
        store,
      },
    );
    expect(result).toEqual({ written: 1, skipped: false });
    await expect(store.list()).resolves.toEqual([
      { slug: 'dostawa', vector: [1, 0, 0, 0] },
    ]);
  });

  it('loads nodes from the catalog loader instead of the fixture', async () => {
    const loadNodes = jest.fn().mockResolvedValue([]);
    const store = new InMemoryContextLeafEmbeddings();
    await expect(
      runLeafIngest(
        { OPENAI_API_KEY: 'sk-test', DATABASE_URL: 'postgres://local' },
        {
          loadNodes,
          embedder: new MapTextEmbedder({}),
          store,
        },
      ),
    ).resolves.toEqual({ written: 0, skipped: false });
    expect(loadNodes).toHaveBeenCalled();
  });
});
