import { createLead, type BitrixLeadGateway } from '../../domain/lead';
import type { IntentQualifier } from './intent-qualifier';
import {
  LOW_INTENT_CONFIDENCE,
  profileOrOutOfScope,
} from './intent-fallback';
import { prepareIntentTurn } from './prepare-intent-turn';
import { SHOP_TOOL_IDS } from './schema';
import type { QualifyResult } from './schema';

class ScriptedQualifier implements IntentQualifier {
  constructor(private readonly results: Array<QualifyResult | Error>) {}

  qualify(): Promise<QualifyResult> {
    const next = this.results.shift();
    if (next === undefined) {
      return Promise.reject(new Error('no scripted qualify result'));
    }
    if (next instanceof Error) {
      return Promise.reject(next);
    }
    return Promise.resolve(next);
  }
}

class RecordingBitrix implements BitrixLeadGateway {
  readonly calls: Parameters<BitrixLeadGateway['crmLeadAdd']>[] = [];

  crmLeadAdd(
    fields: Parameters<BitrixLeadGateway['crmLeadAdd']>[0],
  ): Promise<{ id: string }> {
    this.calls.push([fields]);
    return Promise.resolve({ id: 'bitrix-1' });
  }
}

describe('IntentFallback', () => {
  it('uses out_of_scope and zero shop tools when confidence stays low', async () => {
    const qualifier = new ScriptedQualifier([
      { intent: 'pricing', confidence: 0.1 },
      { intent: 'pricing', confidence: 0.2 },
    ]);
    const turn = await prepareIntentTurn(qualifier, 'hmm');

    expect(0.1).toBeLessThan(LOW_INTENT_CONFIDENCE);
    expect(turn.intent).toBe('out_of_scope');
    expect(turn.toolIds).toEqual([]);
    expect(turn.profile.fallback.onUnknownCase).toBe('out_of_scope');
  });

  it('keeps pricing when reclassify raises confidence', async () => {
    const qualifier = new ScriptedQualifier([
      { intent: 'pricing', confidence: 0.1 },
      { intent: 'pricing', confidence: 0.9 },
    ]);
    const turn = await prepareIntentTurn(qualifier, 'Ile kosztują dywaniki?');

    expect(turn.intent).toBe('pricing');
    expect(turn.toolIds).toEqual(
      expect.arrayContaining(['quote-price', 'resolve-template']),
    );
  });

  it('maps a missing profile to out_of_scope with no shop tools', () => {
    const profile = profileOrOutOfScope('general_agent');
    expect(profile.id).toBe('out_of_scope');
    expect(profile.tools).toEqual([]);
  });

  it('maps a thrown qualifier to out_of_scope', async () => {
    const qualifier = new ScriptedQualifier([new Error('schema')]);
    const turn = await prepareIntentTurn(qualifier, '???');
    expect(turn.intent).toBe('out_of_scope');
    expect(turn.toolIds).toEqual([]);
  });

  it('does not put Bitrix lead on Mastra tools; Nest still requires consent', async () => {
    expect(SHOP_TOOL_IDS).not.toContain('create-lead');
    const turn = await prepareIntentTurn(
      new ScriptedQualifier([{ intent: 'out_of_scope', confidence: 1 }]),
      'chcę rozmawiać z człowiekiem',
    );
    expect(turn.toolIds).toEqual([]);

    const bitrix = new RecordingBitrix();
    const result = await createLead(
      {
        sessionId: 'session-1',
        consent: false,
        contact: { email: 'a@b.pl' },
        vehicleDescription: 'Golf 8',
      },
      bitrix,
    );
    expect(result).toEqual({ status: 'skipped_no_consent' });
    expect(bitrix.calls).toHaveLength(0);
  });
});
