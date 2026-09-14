import { loadContextLeafVectors } from '@api/context-tree/supabase/load-embeddings';
import { MemoryDataStore } from '@api/supabase/data-store';

describe('loadContextLeafVectors', () => {
  it('maps eva_bot.context_node_embeddings onto the search contract', async () => {
    const store = new MemoryDataStore({
      'eva_bot.context_node_embeddings': [
        { slug: 'dostawa', embedding: '[1,0,0]' },
        { slug: 'kolory', embedding: [0, 1, 0] },
      ],
    });
    await expect(loadContextLeafVectors(store)).resolves.toEqual([
      { slug: 'dostawa', vector: [1, 0, 0] },
      { slug: 'kolory', vector: [0, 1, 0] },
    ]);
  });
});
