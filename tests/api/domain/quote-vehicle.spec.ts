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

  it('splits brand, model and year from one reply while the brand is missing', () => {
    const collected = advanceVehicleSlots({
      slots: {},
      message: 'toyota rav4 2019',
      asked: 'car_brand',
      aliases: [
        {
          slotKind: 'brand',
          aliasNormalized: 'toyota',
          canonicalKey: 'Toyota',
          brandKey: null,
        },
        {
          slotKind: 'brand',
          aliasNormalized: 'land',
          canonicalKey: 'Land',
          brandKey: null,
        },
        {
          slotKind: 'brand',
          aliasNormalized: 'land rover',
          canonicalKey: 'Land Rover',
          brandKey: null,
        },
      ],
    });

    expect(collected.missing).toBe('body_type');
    expect(collected.slots).toEqual({
      car_brand: 'toyota',
      car_model: 'rav4',
      year: 2019,
    });

    const twoWordBrand = advanceVehicleSlots({
      slots: {},
      message: 'Land Rover Discovery 2018',
      asked: 'car_brand',
      aliases: [
        {
          slotKind: 'brand',
          aliasNormalized: 'land',
          canonicalKey: 'Land',
          brandKey: null,
        },
        {
          slotKind: 'brand',
          aliasNormalized: 'land rover',
          canonicalKey: 'Land Rover',
          brandKey: null,
        },
      ],
    });
    expect(twoWordBrand.missing).toBe('body_type');
    expect(twoWordBrand.slots).toEqual({
      car_brand: 'Land Rover',
      car_model: 'Discovery',
      year: 2018,
    });

    const brandOnly = advanceVehicleSlots({
      slots: {},
      message: 'Land Rover',
      asked: 'car_brand',
      aliases: [
        {
          slotKind: 'brand',
          aliasNormalized: 'land',
          canonicalKey: 'Land',
          brandKey: null,
        },
        {
          slotKind: 'brand',
          aliasNormalized: 'land rover',
          canonicalKey: 'Land Rover',
          brandKey: null,
        },
      ],
    });
    expect(brandOnly.slots).toEqual({ car_brand: 'Land Rover' });
    expect(brandOnly.missing).toBe('car_model');

    const withBody = advanceVehicleSlots({
      slots: {},
      message: 'toyota rav4 2019 suv',
      asked: 'car_brand',
      aliases: [
        {
          slotKind: 'brand',
          aliasNormalized: 'toyota',
          canonicalKey: 'Toyota',
          brandKey: null,
        },
      ],
    });
    expect(withBody.missing).toBeUndefined();
    expect(withBody.slots).toEqual({
      car_brand: 'toyota',
      car_model: 'rav4',
      year: 2019,
      body_type: 'suv',
    });
  });

  it('keeps model and body given while the year is the question', () => {
    const collected = advanceVehicleSlots({
      slots: { car_brand: 'toyota' },
      message: 'rav4 2019 suv',
      asked: 'year',
      aliases: [
        {
          slotKind: 'brand',
          aliasNormalized: 'toyota',
          canonicalKey: 'Toyota',
          brandKey: null,
        },
      ],
    });

    expect(collected.missing).toBeUndefined();
    expect(collected.slots).toEqual({
      car_brand: 'toyota',
      car_model: 'rav4',
      year: 2019,
      body_type: 'suv',
    });
  });

  it('keeps a body given with the generation and leaves the model', () => {
    const collected = advanceVehicleSlots({
      slots: { car_brand: 'vw', car_model: 'golf', year: 2019 },
      message: 'siódma kombi',
      asked: 'generation',
    });

    expect(collected.slots).toEqual({
      car_brand: 'vw',
      car_model: 'golf',
      year: 2019,
      body_type: 'kombi',
      generation: 'siódma',
    });
    expect(collected.missing).toBeUndefined();
  });

  it('covers reply edges without clobbering slots already stored', () => {
    const brandAliases = [
      {
        slotKind: 'brand' as const,
        aliasNormalized: 'toyota',
        canonicalKey: 'Toyota',
        brandKey: null,
      },
      {
        slotKind: 'brand' as const,
        aliasNormalized: 'vw',
        canonicalKey: 'Volkswagen',
        brandKey: null,
      },
      {
        slotKind: 'brand' as const,
        aliasNormalized: 'volkswagen',
        canonicalKey: 'Volkswagen',
        brandKey: null,
      },
    ];

    const brandInTheMiddle = advanceVehicleSlots({
      slots: {},
      message: 'rav4 toyota, 2019 suv',
      asked: 'year',
      aliases: brandAliases,
    });
    expect(brandInTheMiddle.slots).toEqual({
      car_brand: 'toyota',
      car_model: 'rav4',
      year: 2019,
      body_type: 'suv',
    });

    const repeatedBrand = advanceVehicleSlots({
      slots: { car_brand: 'Volkswagen' },
      message: 'vw golf 8 2020 kombi',
      asked: 'car_model',
      aliases: brandAliases,
    });
    expect(repeatedBrand.slots).toEqual({
      car_brand: 'Volkswagen',
      car_model: 'golf 8',
      year: 2020,
      body_type: 'kombi',
    });

    const storedModel = advanceVehicleSlots({
      slots: { car_brand: 'Toyota', car_model: 'RAV4', year: 2019 },
      message: '2021 Golf 8',
      asked: 'body_type',
    });
    expect(storedModel.slots).toEqual({
      car_brand: 'Toyota',
      car_model: 'RAV4',
      year: 2019,
    });
    expect(storedModel.missing).toBe('body_type');

    const typoBody = advanceVehicleSlots({
      slots: { car_brand: 'vw', car_model: 'golf 8', year: 2019 },
      message: 'hatcback',
      asked: 'body_type',
    });
    expect(typoBody.slots).toEqual({
      car_brand: 'vw',
      car_model: 'golf 8',
      year: 2019,
      body_type: 'hatchback',
    });
    expect(typoBody.missing).toBeUndefined();

    const generationOnly = advanceVehicleSlots({
      slots: { car_brand: 'vw', car_model: 'golf', year: 2019 },
      message: '8 gen',
      asked: 'generation',
    });
    expect(generationOnly.slots).toEqual({
      car_brand: 'vw',
      car_model: 'golf',
      year: 2019,
      generation: '8 gen',
    });

    const yearOutsideWindow = advanceVehicleSlots({
      slots: { car_brand: 'toyota' },
      message: '1979 rav4',
      asked: 'year',
      aliases: brandAliases,
    });
    expect(yearOutsideWindow.slots.year).toBeUndefined();
    expect(yearOutsideWindow.slots.car_model).toBe('rav4');
    expect(yearOutsideWindow.missing).toBe('year');

    const secondYear = advanceVehicleSlots({
      slots: { car_brand: 'toyota', car_model: 'rav4' },
      message: '2015 albo 2019',
      asked: 'year',
    });
    expect(secondYear.slots).toEqual({
      car_brand: 'toyota',
      car_model: 'rav4',
      year: 2015,
    });

    expect(isSlotReply('Ile kosztuje golf 2019?')).toBe(false);
    expect(isSlotReply('a'.repeat(81))).toBe(false);
    const notAReply = advanceVehicleSlots({
      slots: { car_brand: 'Toyota' },
      message: 'Jaki jest termin dostawy?',
      fillMissingFromMessage: false,
    });
    expect(notAReply.slots).toEqual({ car_brand: 'Toyota' });
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
