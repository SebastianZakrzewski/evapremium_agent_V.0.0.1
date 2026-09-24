import { advanceQuoteVehicle, collectVehicleStep, isSlotReply } from '@api/domain/quote-vehicle';
import { StubIntentQualifier } from '@api/mastra/intents/stub-intent-qualifier';
import { prepareIntentTurn } from '@api/mastra/intents/prepare-intent-turn';
import type { IntentQualifier } from '@api/mastra/intents/intent-qualifier';

describe('quote vehicle workflow', () => {
  it('suspends until brand and model arrive, then points at quote-vehicle', () => {
    const suspended = advanceQuoteVehicle({ entities: {} });
    expect(suspended.status).toBe('suspended');
    if (suspended.status !== 'suspended') {
      return;
    }
    expect(suspended.missing).toBe('car_brand');
    expect(suspended.snapshot.step).toBe('waiting_for_vehicle');

    const withBrand = advanceQuoteVehicle({
      entities: suspended.snapshot.entities,
      message: 'Volkswagen',
    });
    expect(withBrand.status).toBe('suspended');

    const ready = advanceQuoteVehicle({
      entities: withBrand.status === 'suspended' ? withBrand.snapshot.entities : {},
      message: 'Golf 8',
    });
    expect(ready).toEqual({
      status: 'ready',
      tool: 'quote-vehicle',
      entities: { car_brand: 'Volkswagen', car_model: 'Golf 8' },
    });
  });

  it('resumes the open workflow without a new qualification', async () => {
    const calls: string[] = [];
    const qualifier: IntentQualifier = {
      qualify: (message) => {
        calls.push(message);
        return new StubIntentQualifier().qualify(message);
      },
    };
    const first = await prepareIntentTurn(qualifier, 'Ile kosztują dywaniki?');
    expect(first.execution.kind).toBe('workflow');
    expect(calls).toEqual(['Ile kosztują dywaniki?']);

    const second = await prepareIntentTurn(qualifier, 'Volkswagen', {
      quoteWorkflow: first.quoteWorkflow,
    });
    expect(calls).toEqual(['Ile kosztują dywaniki?']);
    expect(second.execution.kind).toBe('workflow');
    expect(second.quoteWorkflow?.entities.car_brand).toBe('Volkswagen');

    const third = await prepareIntentTurn(qualifier, 'Golf 8', {
      quoteWorkflow: second.quoteWorkflow,
    });
    expect(calls).toEqual(['Ile kosztują dywaniki?']);
    expect(third.execution.kind).toBe('tool');
    expect(third.toolIds).toEqual(
      ['quote-vehicle'],
    );
    expect(third.quoteWorkflow).toBeUndefined();
  });

  it('drops the workflow when the next message is a new question', async () => {
    expect(isSlotReply('Jaki jest termin dostawy?')).toBe(false);
    const first = await prepareIntentTurn(
      new StubIntentQualifier(),
      'Ile kosztują dywaniki?',
    );
    const next = await prepareIntentTurn(
      new StubIntentQualifier(),
      'Jaki jest termin dostawy?',
      { quoteWorkflow: first.quoteWorkflow },
    );
    expect(next.intent).toBe('delivery');
    expect(next.quoteWorkflow).toBeUndefined();
  });

  it('builds the Mastra suspend payload and the ready output', () => {
    const suspended = collectVehicleStep({ entities: {} });
    expect(suspended).toEqual({
      action: 'suspend',
      payload: {
        step: 'waiting_for_vehicle',
        missing: 'car_brand',
        entities: {},
      },
    });
    expect(
      collectVehicleStep({
        entities: { car_brand: 'Volkswagen' },
        message: 'Golf 8',
      }),
    ).toEqual({
      action: 'complete',
      output: {
        status: 'ready',
        tool: 'quote-vehicle',
        entities: { car_brand: 'Volkswagen', car_model: 'Golf 8' },
      },
    });
  });
});
