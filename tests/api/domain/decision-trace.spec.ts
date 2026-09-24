import { decisionTracePayload } from '@api/domain/decision-trace';

describe('decision trace', () => {
  it('keeps the payload to routing fields', () => {
    const message = 'Ile kosztują dywaniki do Golfa 8?';
    const payload = decisionTracePayload({
      intent: 'pricing',
      subIntent: 'indicative_quote',
      mode: 'action',
      execution: 'workflow',
      workflow: 'quote_vehicle',
    });

    expect(payload).toEqual({
      intent: 'pricing',
      sub_intent: 'indicative_quote',
      mode: 'action',
      execution: 'workflow',
      workflow: 'quote_vehicle',
    });
    expect(JSON.stringify(payload)).not.toContain(message);
    expect(Object.keys(payload).sort()).toEqual(
      ['execution', 'intent', 'mode', 'sub_intent', 'workflow'].sort(),
    );
  });
});
