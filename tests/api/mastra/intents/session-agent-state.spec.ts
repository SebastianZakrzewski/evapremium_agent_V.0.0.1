import { MemoryDataStore } from '@api/supabase/data-store';
import { SupabaseIntentSessionState } from '@api/mastra/intents/supabase-intent-session-state';

describe('supabase intent session state', () => {
  it('reloads intent after a new adapter and keeps it when fitment is cleared', async () => {
    const store = new MemoryDataStore();
    const first = new SupabaseIntentSessionState(store);
    first.set('session-1', 'pricing');
    first.setQuoteWorkflow('session-1', {
      workflow: 'quote_vehicle',
      step: 'waiting_for_vehicle',
      entities: { car_brand: 'Volkswagen' },
    });
    first.setFitment('session-1', {
      workflow: 'fitment_cascade',
      step: 'waiting_for_vehicle',
      missing: 'year',
      slots: { car_brand: 'Volkswagen', car_model: 'Golf' },
    });
    await first.flush('session-1');

    const second = new SupabaseIntentSessionState(store);
    await second.load('session-1');
    expect(second.get('session-1')).toBe('pricing');
    expect(second.getFitment('session-1')?.missing).toBe('year');
    second.setFitment('session-1', undefined);
    await second.flush('session-1');

    const third = new SupabaseIntentSessionState(store);
    await third.load('session-1');
    expect(third.get('session-1')).toBe('pricing');
    expect(third.getQuoteWorkflow('session-1')?.entities.car_brand).toBe('Volkswagen');
    expect(third.getFitment('session-1')).toBeUndefined();
    const rows = await store.selectEq<Record<string, unknown>>(
      'eva_bot',
      'session_agent_state',
      'session_id',
      'session-1',
    );
    expect(JSON.stringify(rows[0])).not.toMatch(/Golf 8 hatchback 2020/);
  });
});
