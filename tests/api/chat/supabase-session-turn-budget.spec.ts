import { MemoryDataStore } from '@api/supabase/data-store';
import {
  SupabaseChatTurnBudget,
  guestSubjectHash,
  utcHourStart,
} from '@api/chat/session-turn-budget';

const IP = '203.0.113.40';
const HOUR = new Date('2026-10-04T01:15:00.000Z');
const NEXT_HOUR = new Date('2026-10-04T02:00:00.000Z');

function ledger(): { budget: SupabaseChatTurnBudget; store: MemoryDataStore } {
  const store = new MemoryDataStore({
    'eva_bot.chat_sessions': [{ id: 'session-1', user_turns: 0 }],
  });
  return {
    store,
    budget: new SupabaseChatTurnBudget(store, {
      sessionTurns: 25,
      guestTurns: 40,
      guestSessions: 10,
      salt: 'test-salt',
    }),
  };
}

describe('supabase chat turn budget', () => {
  it('keeps the in-memory budget contract on the data-store adapter', async () => {
    const { budget, store } = ledger();
    for (let index = 0; index < 25; index += 1) {
      expect(await budget.reserveSessionTurn('session-1')).toBe(true);
    }
    expect(await budget.reserveSessionTurn('session-1')).toBe(false);
    expect(await budget.sessionTurnCount('session-1')).toBe(25);

    for (let index = 0; index < 40; index += 1) {
      expect(await budget.reserveGuestTurn(IP, HOUR)).toBe(true);
    }
    expect(await budget.reserveGuestTurn(IP, HOUR)).toBe(false);
    expect(await budget.reserveGuestTurn(IP, NEXT_HOUR)).toBe(true);
    expect(await budget.sessionTurnCount('session-1')).toBe(25);

    for (let index = 0; index < 10; index += 1) {
      expect(await budget.reserveGuestSession(IP, HOUR)).toBe(true);
    }
    expect(await budget.reserveGuestSession(IP, HOUR)).toBe(false);
    expect(await budget.guestSessionCount(IP, HOUR)).toBe(10);

    expect(await budget.reserveGuestTurn('', HOUR)).toBe(false);
    const hash = guestSubjectHash(IP, 'test-salt');
    expect(hash).toBeDefined();
    expect(hash).not.toContain(IP);
    expect(utcHourStart(HOUR)).toBe('2026-10-04T01:00:00.000Z');
    const buckets = await store.selectAll<{ bucket_key: string }>(
      'eva_bot',
      'usage_buckets',
    );
    expect(buckets.length).toBeGreaterThan(0);
    expect(buckets.every((row) => !row.bucket_key.includes('\0'))).toBe(true);
  });
});
