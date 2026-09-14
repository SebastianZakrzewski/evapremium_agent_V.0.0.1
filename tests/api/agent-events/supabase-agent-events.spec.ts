import { MemoryDataStore } from '@api/supabase/data-store';
import { InMemoryAgentEvents } from '@api/agent-events/in-memory-agent-events';
import { SupabaseAgentEvents } from '@api/agent-events/supabase-agent-events';

describe('agent event persistence', () => {
  it('writes the same contract as in-memory onto eva_bot.agent_events', async () => {
    const store = new MemoryDataStore();
    const events = new SupabaseAgentEvents(store, () => new Date('2026-09-13T10:00:00.000Z'));

    await events.append({
      sessionId: 'session-1',
      type: 'quote_issued',
      payload: { amount: 599, currency: 'PLN' },
    });

    await expect(events.listBySession('session-1')).resolves.toEqual([
      expect.objectContaining({
        sessionId: 'session-1',
        type: 'quote_issued',
        payload: { amount: 599, currency: 'PLN' },
        occurredAt: '2026-09-13T10:00:00.000Z',
      }),
    ]);
    const raw = await store.selectEq<Record<string, unknown>>(
      'eva_bot',
      'agent_events',
      'session_id',
      'session-1',
    );
    expect(raw).toEqual([
      expect.objectContaining({
        session_id: 'session-1',
        type: 'quote_issued',
        payload: { amount: 599, currency: 'PLN' },
      }),
    ]);
  });

  it('lists events for one session and a time range', async () => {
    const memory = new InMemoryAgentEvents(
      (() => {
        const times = [
          '2026-09-13T08:00:00.000Z',
          '2026-09-13T12:00:00.000Z',
          '2026-09-12T12:00:00.000Z',
        ];
        return () => new Date(times.shift() ?? '2026-09-13T00:00:00.000Z');
      })(),
    );
    await memory.append({
      sessionId: 'session-a',
      type: 'cascade_resolved',
      payload: { match: 'one' },
    });
    await memory.append({
      sessionId: 'session-b',
      type: 'context_hit',
      payload: { slug: 'dostawa' },
    });
    await memory.append({
      sessionId: 'session-a',
      type: 'intent_accepted',
      payload: { intent: 'pricing' },
    });

    await expect(memory.listBySession('session-a')).resolves.toEqual([
      expect.objectContaining({ type: 'cascade_resolved' }),
      expect.objectContaining({ type: 'intent_accepted' }),
    ]);
    await expect(
      memory.listInRange(
        '2026-09-13T00:00:00.000Z',
        '2026-09-13T23:59:59.000Z',
      ),
    ).resolves.toEqual([
      expect.objectContaining({ type: 'cascade_resolved' }),
      expect.objectContaining({ type: 'context_hit' }),
    ]);
  });

  it('filters supabase rows by session and day range', async () => {
    const store = new MemoryDataStore();
    const events = new SupabaseAgentEvents(store);
    await store.insert('eva_bot', 'agent_events', {
      id: 'e1',
      session_id: 'session-a',
      occurred_at: '2026-09-13T08:00:00.000Z',
      type: 'cascade_resolved',
      payload: { match: 'one' },
    });
    await store.insert('eva_bot', 'agent_events', {
      id: 'e2',
      session_id: 'session-b',
      occurred_at: '2026-09-13T12:00:00.000Z',
      type: 'quote_issued',
      payload: { amount: 1, currency: 'PLN' },
    });
    await store.insert('eva_bot', 'agent_events', {
      id: 'e3',
      session_id: 'session-a',
      occurred_at: '2026-09-12T12:00:00.000Z',
      type: 'intent_accepted',
      payload: { intent: 'pricing' },
    });

    await expect(events.listBySession('session-a')).resolves.toEqual([
      expect.objectContaining({ id: 'e1' }),
      expect.objectContaining({ id: 'e3' }),
    ]);
    await expect(
      events.listInRange(
        '2026-09-13T00:00:00.000Z',
        '2026-09-13T23:59:59.000Z',
      ),
    ).resolves.toEqual([
      expect.objectContaining({ id: 'e1' }),
      expect.objectContaining({ id: 'e2' }),
    ]);
  });
});
