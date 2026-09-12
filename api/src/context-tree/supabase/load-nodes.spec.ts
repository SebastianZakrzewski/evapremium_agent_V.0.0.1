import { loadContextNodes } from './load-nodes';
import { MemoryDataStore } from '../../supabase/data-store';

describe('loadContextNodes', () => {
  it('maps eva_bot.context_nodes onto the lookup contract', async () => {
    const store = new MemoryDataStore({
      'eva_bot.context_nodes': [
        {
          id: 'n1',
          parent_id: null,
          slug: 'dostawa',
          title: 'Dostawa',
          body: 'Wysyłka w 5–7 dni roboczych.',
          sort_order: 0,
          is_active: true,
        },
      ],
    });
    await expect(loadContextNodes(store)).resolves.toEqual([
      {
        id: 'n1',
        parentId: null,
        slug: 'dostawa',
        title: 'Dostawa',
        body: 'Wysyłka w 5–7 dni roboczych.',
        sortOrder: 0,
        isActive: true,
      },
    ]);
  });
});
