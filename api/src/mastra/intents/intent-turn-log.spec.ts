import { formatIntentTurnLog } from './intent-turn-log';
import { prepareIntentTurn } from './prepare-intent-turn';
import { StubIntentQualifier } from './stub-intent-qualifier';
import type { IntentTurnLog } from './intent-turn-log';

describe('formatIntentTurnLog', () => {
  it('prints session and intent fields without message text', () => {
    const line = formatIntentTurnLog({
      sessionId: 'session-1',
      currentIntent: 'product_info',
      candidateIntent: 'pricing',
      acceptedIntent: 'pricing',
      tools: ['resolve-template', 'quote-price'],
      forcedOutOfScope: false,
    });
    expect(line).toBe(
      '[intent-turn] session=session-1 current=product_info candidate=pricing accepted=pricing tools=resolve-template,quote-price forcedOutOfScope=false',
    );
    expect(line).not.toMatch(/Golf|dywan/i);
  });
});

describe('prepareIntentTurn logging', () => {
  it('emits one turn log with session and accepted intent', async () => {
    const logs: IntentTurnLog[] = [];
    const turn = await prepareIntentTurn(
      new StubIntentQualifier(),
      'Ile kosztują dywaniki do Golfa 8?',
      {
        sessionId: 'session-log',
        currentIntent: 'product_info',
        log: (entry) => logs.push(entry),
      },
    );
    expect(logs).toHaveLength(1);
    expect(logs[0]).toEqual({
      sessionId: 'session-log',
      currentIntent: 'product_info',
      candidateIntent: 'pricing',
      acceptedIntent: 'pricing',
      tools: turn.toolIds,
      forcedOutOfScope: false,
    });
  });
});
