import {
  InMemoryChatTurnBudget,
  guestSubjectHash,
  turnBudgetLimitsFromEnv,
  type TurnBudgetLimits,
} from '@api/chat/session-turn-budget';

const IP = '203.0.113.10';
const HOUR = new Date('2026-10-04T01:15:00.000Z');
const NEXT_HOUR = new Date('2026-10-04T02:00:00.000Z');

function budget(limits?: Partial<TurnBudgetLimits>): InMemoryChatTurnBudget {
  return new InMemoryChatTurnBudget({
    sessionTurns: 25,
    guestTurns: 40,
    guestSessions: 10,
    salt: 'test-salt',
    ...limits,
  });
}

describe('in-memory chat turn budget', () => {
  it('accepts the 25th session message and rejects the 26th without raising the counter', async () => {
    const ledger = budget();
    for (let index = 0; index < 25; index += 1) {
      expect(await ledger.reserveSessionTurn('session-1')).toBe(true);
    }
    expect(await ledger.reserveSessionTurn('session-1')).toBe(false);
    expect(await ledger.sessionTurnCount('session-1')).toBe(25);
  });

  it('does not count an assistant greeting as a session turn', async () => {
    const ledger = budget();
    expect(await ledger.reserveGuestSession(IP, HOUR)).toBe(true);
    expect(await ledger.sessionTurnCount('session-1')).toBe(0);
  });

  it('resets the guest message bucket on the next UTC hour and keeps the session counter', async () => {
    const ledger = budget();
    for (let index = 0; index < 5; index += 1) {
      expect(await ledger.reserveSessionTurn('session-1')).toBe(true);
    }
    for (let index = 0; index < 40; index += 1) {
      expect(await ledger.reserveGuestTurn(IP, HOUR)).toBe(true);
    }
    expect(await ledger.reserveGuestTurn(IP, HOUR)).toBe(false);
    expect(await ledger.reserveGuestTurn(IP, NEXT_HOUR)).toBe(true);
    expect(await ledger.sessionTurnCount('session-1')).toBe(5);
    expect(await ledger.guestSessionCount(IP, HOUR)).toBe(0);
  });

  it('accepts the 10th guest session and rejects the 11th in the same UTC hour', async () => {
    const ledger = budget();
    for (let index = 0; index < 10; index += 1) {
      expect(await ledger.reserveGuestSession(IP, HOUR)).toBe(true);
    }
    expect(await ledger.reserveGuestSession(IP, HOUR)).toBe(false);
    expect(await ledger.guestSessionCount(IP, HOUR)).toBe(10);
    expect(await ledger.reserveGuestSession(IP, NEXT_HOUR)).toBe(true);
  });

  it('lets only one of two parallel reserves pass on the last session unit', async () => {
    const ledger = budget();
    for (let index = 0; index < 24; index += 1) {
      expect(await ledger.reserveSessionTurn('session-1')).toBe(true);
    }
    const [first, second] = await Promise.all([
      ledger.reserveSessionTurn('session-1'),
      ledger.reserveSessionTurn('session-1'),
    ]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(await ledger.sessionTurnCount('session-1')).toBe(25);
  });

  it('denies an empty IP or empty salt and stores no guest hash', async () => {
    const open = budget({ salt: '' });
    expect(await open.reserveGuestTurn(IP, HOUR)).toBe(false);
    expect(await open.reserveGuestSession('', HOUR)).toBe(false);
    expect(open.storedGuestBuckets()).toBe(0);

    const salted = budget();
    expect(await salted.reserveGuestTurn('   ', HOUR)).toBe(false);
    expect(await salted.reserveGuestSession('', HOUR)).toBe(false);
    expect(salted.storedGuestBuckets()).toBe(0);
    expect(guestSubjectHash(IP, 'test-salt')).not.toContain(IP);
  });

  it('rejects a zero or negative limit and defaults when the variable is absent', () => {
    expect(turnBudgetLimitsFromEnv({}).sessionTurns).toBe(25);
    expect(turnBudgetLimitsFromEnv({}).guestTurns).toBe(40);
    expect(turnBudgetLimitsFromEnv({}).guestSessions).toBe(10);
    expect(() => turnBudgetLimitsFromEnv({ CHAT_SESSION_TURN_LIMIT: '0' })).toThrow(
      /CHAT_SESSION_TURN_LIMIT/,
    );
    expect(() => turnBudgetLimitsFromEnv({ CHAT_IP_TURN_LIMIT: '-3' })).toThrow(
      /CHAT_IP_TURN_LIMIT/,
    );
    expect(() => turnBudgetLimitsFromEnv({}, { requireSalt: true })).toThrow(
      /CHAT_BUDGET_IP_SALT/,
    );
  });
});
