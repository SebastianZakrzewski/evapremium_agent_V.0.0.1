import { formatIntentTurnLog } from '@api/mastra/intents/intent-turn-log';
import { prepareIntentTurn } from '@api/mastra/intents/prepare-intent-turn';
import { StubIntentQualifier } from '@api/mastra/intents/stub-intent-qualifier';
import type { IntentTurnLog } from '@api/mastra/intents/intent-turn-log';

describe('formatIntentTurnLog', () => {
  it('prints session and intent fields without message text', () => {
    const line = formatIntentTurnLog(
      {
        sessionId: 'session-1',
        currentIntent: 'product_info',
        candidateIntent: 'pricing',
        acceptedIntent: 'pricing',
        tools: ['resolve-template', 'quote-price'],
        forcedOutOfScope: false,
      },
      { color: false },
    );
    expect(line).toBe(
      [
        '[intent-turn] sesja session-1',
        '  było        product_info',
        '  kandydat    pricing',
        '  przyjęto    pricing',
        '  narzędzia   resolve-template, quote-price',
        '  zakres      w ofercie',
      ].join('\n'),
    );
    expect(line).not.toMatch(/Golf|dywan/i);
  });

  it('colors accepted intent and marks a rejected candidate', () => {
    const line = formatIntentTurnLog(
      {
        sessionId: 'session-1',
        currentIntent: 'pricing',
        candidateIntent: 'out_of_scope',
        acceptedIntent: 'pricing',
        tools: ['resolve-template', 'quote-price'],
        forcedOutOfScope: false,
      },
      { color: true },
    );
    expect(line).toContain('\x1b[33mout_of_scope\x1b[0m');
    expect(line).toContain('\x1b[32mpricing\x1b[0m');
    expect(line).toContain('w ofercie');
    expect(line).not.toMatch(/\x1b\[31m/);
  });

  it('omits ANSI when NO_COLOR is set', () => {
    const previous = process.env.NO_COLOR;
    process.env.NO_COLOR = '1';
    try {
      const line = formatIntentTurnLog({
        acceptedIntent: 'out_of_scope',
        tools: [],
        forcedOutOfScope: true,
      });
      expect(line).not.toContain('\x1b[');
      expect(line).toContain('wymuszony poza ofertą');
      expect(line).toContain('sesja —');
    } finally {
      if (previous === undefined) {
        delete process.env.NO_COLOR;
      } else {
        process.env.NO_COLOR = previous;
      }
    }
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
