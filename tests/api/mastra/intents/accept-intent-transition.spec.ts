import { acceptIntentTransition } from '@api/mastra/intents/accept-intent-transition';
import { InMemoryIntentSessionState } from '@api/mastra/intents/intent-session-state';
import type { IntentQualifier } from '@api/mastra/intents/intent-qualifier';
import { prepareIntentTurn } from '@api/mastra/intents/prepare-intent-turn';
import { StubIntentQualifier } from '@api/mastra/intents/stub-intent-qualifier';
import type { QualifyResult } from '@api/mastra/intents/schema';
import { coarseQualifyResult } from '@api/mastra/intents/schema';

class ScriptedQualifier implements IntentQualifier {
  constructor(private readonly results: QualifyResult[]) {}

  qualify(): Promise<QualifyResult> {
    const next = this.results.shift();
    if (next === undefined) {
      return Promise.reject(new Error('no scripted qualify result'));
    }
    return Promise.resolve(next);
  }
}

describe('acceptIntentTransition', () => {
  it('accepts the candidate when the session has no current intent', () => {
    expect(acceptIntentTransition(undefined, 'pricing')).toBe('pricing');
  });

  it('allows product_info to switch to pricing', () => {
    expect(acceptIntentTransition('product_info', 'pricing')).toBe('pricing');
  });

  it('rejects an off-graph candidate and keeps product_info', () => {
    expect(acceptIntentTransition('product_info', 'out_of_scope')).toBe(
      'product_info',
    );
  });

  it('allows leaving out_of_scope toward product_info', () => {
    expect(acceptIntentTransition('out_of_scope', 'product_info')).toBe(
      'product_info',
    );
  });
});

describe('intent session memory', () => {
  it('loads pricing tools on a legal switch from product_info', async () => {
    const state = new InMemoryIntentSessionState();
    const sessionId = 'session-a';
    const qualifier = new StubIntentQualifier();

    const first = await prepareIntentTurn(
      qualifier,
      'Czy dywaniki pasują do Golfa 8?',
      { currentIntent: state.get(sessionId) },
    );
    state.set(sessionId, first.intent);
    expect(first.intent).toBe('product_info');
    expect(first.toolIds).not.toContain('quote-price');

    const second = await prepareIntentTurn(
      qualifier,
      'Ile kosztują dywaniki Volkswagen Golf 8?',
      { currentIntent: state.get(sessionId) },
    );
    state.set(sessionId, second.intent);
    expect(second.intent).toBe('pricing');
    expect(second.toolIds).toEqual(
      ['quote-vehicle'],
    );
  });

  it('keeps product_info tools when qualify proposes out_of_scope', async () => {
    const turn = await prepareIntentTurn(
      new ScriptedQualifier([coarseQualifyResult('out_of_scope', 1)]),
      'jaki jest kurs euro',
      { currentIntent: 'product_info' },
    );
    expect(turn.intent).toBe('product_info');
    expect(turn.toolIds).not.toContain('quote-price');
    expect(turn.toolIds).toEqual(
      expect.arrayContaining(['lookup-leaf', 'resolve-template', 'search-leaves']),
    );
  });

  it('does not share intent across sessions', () => {
    const state = new InMemoryIntentSessionState();
    state.set('one', 'pricing');
    expect(state.get('two')).toBeUndefined();
    expect(state.get('one')).toBe('pricing');
  });

  it('still forces out_of_scope after low-confidence fallback', async () => {
    const turn = await prepareIntentTurn(
      new ScriptedQualifier([
        coarseQualifyResult('pricing', 0.1),
        coarseQualifyResult('pricing', 0.2),
      ]),
      'hmm',
      { currentIntent: 'product_info' },
    );
    expect(turn.intent).toBe('out_of_scope');
    expect(turn.toolIds).toEqual([]);
  });
});
