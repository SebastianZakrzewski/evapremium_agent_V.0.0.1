import { advanceQuoteVehicle, advanceVehicleSlots, collectVehicleStep, isSlotReply } from '@api/domain/quote-vehicle';
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

    const withModel = advanceQuoteVehicle({
      entities: withBrand.status === 'suspended' ? withBrand.snapshot.entities : {},
      message: 'Golf 8',
    });
    expect(withModel.status).toBe('suspended');
    if (withModel.status !== 'suspended') {
      return;
    }
    expect(withModel.missing).toBe('year');

    const withYear = advanceQuoteVehicle({
      entities: withModel.snapshot.entities,
      message: '2019',
    });
    expect(withYear.status).toBe('suspended');
    if (withYear.status !== 'suspended') {
      return;
    }
    expect(withYear.missing).toBe('body_type');

    const ready = advanceQuoteVehicle({
      entities: withYear.snapshot.entities,
      message: 'kombi',
    });
    expect(ready).toEqual({
      status: 'ready',
      tool: 'quote-vehicle',
      entities: {
        car_brand: 'Volkswagen',
        car_model: 'Golf 8',
        year: 2019,
        body_type: 'kombi',
      },
    });
  });

  it('keeps year and body written in the model reply', () => {
    const collected = advanceVehicleSlots({
      slots: { car_brand: 'Volkswagen' },
      message: 'Golf 8 kombi 2020',
    });

    expect(collected.slots).toEqual({
      car_brand: 'Volkswagen',
      car_model: 'Golf 8',
      year: 2020,
      body_type: 'kombi',
    });
    expect(collected.missing).toBeUndefined();
  });

  it('keeps the body given in the same reply as the year', () => {
    const collected = advanceVehicleSlots({
      slots: { car_brand: 'Toyota', car_model: 'RAV4' },
      message: '2021 rok SUV',
    });

    expect(collected.missing).toBeUndefined();
    expect(collected.slots).toEqual({
      car_brand: 'Toyota',
      car_model: 'RAV4',
      year: 2021,
      body_type: 'suv',
    });
  });

  it('resumes fitment for a price question without a new qualification', async () => {
    const calls: string[] = [];
    const qualifier: IntentQualifier = {
      qualify: (message) => {
        calls.push(message);
        return new StubIntentQualifier().qualify(message);
      },
    };
    const first = await prepareIntentTurn(qualifier, 'Ile kosztują dywaniki?');
    expect(first.execution).toEqual({
      kind: 'workflow',
      workflow: 'fitment_cascade',
    });
    expect(first.fitment?.missing).toBe('car_brand');
    expect(calls).toEqual(['Ile kosztują dywaniki?']);

    const second = await prepareIntentTurn(qualifier, 'Volkswagen', {
      fitment: first.fitment,
    });
    expect(calls).toEqual(['Ile kosztują dywaniki?']);
    expect(second.execution).toEqual({
      kind: 'workflow',
      workflow: 'fitment_cascade',
    });
    expect(second.fitment?.slots.car_brand).toBe('Volkswagen');
    expect(second.quoteWorkflow).toBeUndefined();
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
        entities: {
          car_brand: 'Volkswagen',
          car_model: 'Golf 8',
          year: 2019,
        },
        message: 'kombi',
      }),
    ).toEqual({
      action: 'complete',
      output: {
        status: 'ready',
        tool: 'quote-vehicle',
        entities: {
          car_brand: 'Volkswagen',
          car_model: 'Golf 8',
          year: 2019,
          body_type: 'kombi',
        },
      },
    });
  });
});
