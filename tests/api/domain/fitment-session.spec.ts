import { advanceFitmentCascade } from '@api/domain/fitment-session';
import { readBodyType, readYear } from '@api/domain/quote-vehicle';
import { resolveClassifiedTemplate, resolveTemplate } from '@api/domain/template-cascade';
import {
  CASCADE_ALIASES,
  CASCADE_TEMPLATES,
} from '@api/templates/in-memory/cascade-fixture';

describe('fitment session', () => {
  const resolve = (input: {
    brand?: string;
    model?: string;
    bodyType?: string;
    year?: number;
  }) => Promise.resolve(resolveTemplate(input, CASCADE_TEMPLATES, CASCADE_ALIASES));

  it('takes brand, model and year from the reply that was asked as a brand', async () => {
    const waiting = await advanceFitmentCascade({
      slots: {},
      message: 'vw golf 8 2019',
      asked: 'car_brand',
      resolve,
      aliases: CASCADE_ALIASES,
    });

    expect(waiting).toMatchObject({
      status: 'suspended',
      snapshot: {
        missing: 'body_type',
        slots: { car_brand: 'vw', car_model: 'golf 8', year: 2019 },
      },
    });
  });

  it('resolves the body given together with the year it asked for', async () => {
    const ready = await advanceFitmentCascade({
      slots: { car_brand: 'vw', car_model: 'golf 8' },
      message: '2019 kombi',
      asked: 'year',
      resolve,
      aliases: CASCADE_ALIASES,
    });

    expect(ready).toMatchObject({
      status: 'ready',
      result: { status: 'one', template: { id: 'tmpl-golf-mk8-wagon' } },
    });
  });

  it('classifies a generation the ordinal list does not know', async () => {
    const calls: string[] = [];
    const waiting = await advanceFitmentCascade({
      slots: { car_brand: 'vw', car_model: 'golf', year: 2019, generation: 'nowsza' },
      resolve,
      aliases: CASCADE_ALIASES,
      classifyGeneration: async (text, keys) => {
        calls.push(text);
        return keys.includes('8 gen') ? '8 gen' : null;
      },
    });

    expect(calls).toEqual(['nowsza']);
    expect(waiting).toMatchObject({
      status: 'suspended',
      snapshot: {
        missing: 'body_type',
        slots: { car_brand: 'vw', car_model: 'golf', year: 2019, generation: '8 gen' },
      },
    });
  });

  it('stores a classified body key and resolves the template', async () => {
    const ready = await advanceFitmentCascade({
      slots: { car_brand: 'vw', car_model: 'golf 8', year: 2021, body_type: 'suv' },
      resolve: (input) =>
        resolveClassifiedTemplate(input, CASCADE_TEMPLATES, CASCADE_ALIASES, {
          classifyBrand: async () => null,
          classifyModel: async () => [],
          classifyBody: async () => 'hatchback',
        }),
      aliases: CASCADE_ALIASES,
    });

    expect(ready).toMatchObject({
      status: 'ready',
      result: { status: 'one', template: { id: 'tmpl-golf-mk8-hatch' } },
    });
  });

  it('asks for the body that still splits one generation', async () => {
    const waiting = await advanceFitmentCascade({
      slots: { car_brand: 'vw', car_model: 'golf 8' },
      resolve,
      aliases: CASCADE_ALIASES,
    });

    expect(waiting).toMatchObject({
      status: 'suspended',
      snapshot: {
        missing: 'body_type',
        step: 'waiting_for_vehicle',
        options: ['hatchback', 'wagon'],
        slots: { car_brand: 'vw', car_model: 'golf 8' },
      },
    });
  });

  it('maps a short body reply onto a body alias', () => {
    expect(readBodyType('hatcback')).toBe('hatchback');
    expect(readBodyType('kombi')).toBe('kombi');
    expect(readYear('rocznik 2019')).toBe(2019);
  });

  it('resolves one template once the remaining body is known', async () => {
    const waiting = await advanceFitmentCascade({
      slots: { car_brand: 'vw', car_model: 'golf 8', year: 2021 },
      resolve,
      aliases: CASCADE_ALIASES,
    });
    expect(waiting.status).toBe('suspended');
    if (waiting.status !== 'suspended') {
      return;
    }

    const ready = await advanceFitmentCascade({
      slots: waiting.snapshot.slots,
      message: 'hatcback',
      asked: waiting.snapshot.missing,
      resolve,
      aliases: CASCADE_ALIASES,
    });

    expect(ready).toMatchObject({
      status: 'ready',
      result: { status: 'one', template: { bodyTypeKey: 'hatchback' } },
    });
  });

  it('resolves the only body without asking for year', async () => {
    const ready = await advanceFitmentCascade({
      slots: { car_brand: 'audi', car_model: 'a4' },
      resolve,
      aliases: CASCADE_ALIASES,
    });

    expect(ready).toMatchObject({
      status: 'ready',
      result: { status: 'one', template: { id: 'tmpl-audi-a4-sedan' } },
    });
  });

  it('asks for generation when the year overlaps two ranges and keeps the model', async () => {
    const waiting = await advanceFitmentCascade({
      slots: { car_brand: 'vw', car_model: 'golf', year: 2019 },
      resolve,
      aliases: CASCADE_ALIASES,
    });

    expect(waiting).toMatchObject({
      status: 'suspended',
      snapshot: {
        missing: 'generation',
        options: ['7 gen', '8 gen'],
        slots: { car_brand: 'vw', car_model: 'golf', year: 2019 },
      },
    });
  });

  it('keeps the model when the generation reply is an ordinal', async () => {
    const waiting = await advanceFitmentCascade({
      slots: { car_brand: 'vw', car_model: 'golf', year: 2019 },
      resolve,
      aliases: CASCADE_ALIASES,
    });
    expect(waiting.status).toBe('suspended');
    if (waiting.status !== 'suspended') {
      return;
    }

    const bodies = await advanceFitmentCascade({
      slots: waiting.snapshot.slots,
      message: 'siódma',
      asked: waiting.snapshot.missing,
      resolve,
      aliases: CASCADE_ALIASES,
    });

    expect(bodies).toMatchObject({
      status: 'suspended',
      snapshot: {
        missing: 'body_type',
        slots: {
          car_brand: 'vw',
          car_model: 'golf',
          year: 2019,
          generation: 'siódma',
        },
      },
    });
  });

  it('skips generation when the year matches a single range', async () => {
    const waiting = await advanceFitmentCascade({
      slots: { car_brand: 'vw', car_model: 'golf', year: 2021 },
      resolve,
      aliases: CASCADE_ALIASES,
    });

    expect(waiting).toMatchObject({
      status: 'suspended',
      snapshot: {
        missing: 'body_type',
        slots: { car_brand: 'vw', car_model: 'golf', year: 2021 },
      },
    });
  });
  it('asks again for year when the given year matches nothing', async () => {
    const waiting = await advanceFitmentCascade({
      slots: { car_brand: 'vw', car_model: 'golf 8', year: 2005 },
      resolve,
      aliases: CASCADE_ALIASES,
    });

    expect(waiting).toMatchObject({
      status: 'suspended',
      snapshot: {
        missing: 'year',
        options: ['2019+'],
        slots: { car_brand: 'vw', car_model: 'golf 8' },
      },
    });
  });

  it('asks for the year after the opening sentence already named the car', async () => {
    const rav4 = {
      id: 'tmpl-rav4',
      recordKey: 'rav4',
      brandKey: 'Toyota',
      modelKey: 'RAV4',
      dealerPricingCategoryKey: 'passenger_car',
      isActive: true,
      yearFrom: 2018,
      yearTo: 2024,
      isOpenEnded: false,
      bodyTypeKey: 'suv',
      bodyType1Key: 'suv',
      bodyType2Key: null,
      bodyType3Key: null,
    };
    const waiting = await advanceFitmentCascade({
      slots: {},
      message: 'dywaniki do Toyota RAV4',
      resolve: (input) =>
        Promise.resolve(
          resolveTemplate(
            input,
            [rav4, { ...rav4, id: 'tmpl-rav4-older', yearFrom: 2013, yearTo: 2018 }],
            [
              ...CASCADE_ALIASES,
              {
                slotKind: 'brand',
                aliasNormalized: 'toyota',
                canonicalKey: 'Toyota',
                brandKey: null,
              },
              {
                slotKind: 'model',
                aliasNormalized: 'rav4',
                canonicalKey: 'RAV4',
                brandKey: 'Toyota',
              },
            ],
          ),
        ),
      aliases: [
        ...CASCADE_ALIASES,
        {
          slotKind: 'brand',
          aliasNormalized: 'toyota',
          canonicalKey: 'Toyota',
          brandKey: null,
        },
        {
          slotKind: 'model',
          aliasNormalized: 'rav4',
          canonicalKey: 'RAV4',
          brandKey: 'Toyota',
        },
      ],
    });

    expect(waiting).toMatchObject({
      status: 'suspended',
      snapshot: {
        missing: 'year',
        slots: { car_brand: 'Toyota', car_model: 'RAV4' },
      },
    });
  });

  it('keeps the model when two templates share the year and generation', async () => {
    const shared = {
      dealerPricingCategoryKey: 'passenger_car',
      isActive: true,
      yearFrom: 2007,
      yearTo: 2015,
      isOpenEnded: false,
      bodyTypeKey: 'wagon',
      bodyType1Key: 'wagon',
      bodyType2Key: null,
      bodyType3Key: null,
      generation: '4 gen',
    };
    const templates = [
      {
        ...shared,
        id: 'tmpl-a4-allroad',
        recordKey: 'a4-allroad',
        brandKey: 'Audi',
        modelKey: 'A4 Allroad(B8) 4 gen',
      },
      {
        ...shared,
        id: 'tmpl-a4-polift',
        recordKey: 'a4-polift',
        brandKey: 'Audi',
        modelKey: 'A4(B8) polift 4 gen',
      },
    ];
    const waiting = await advanceFitmentCascade({
      slots: { car_brand: 'audi', car_model: 'a4', year: 2012 },
      resolve: () =>
        Promise.resolve({ status: 'many', templates }),
      aliases: CASCADE_ALIASES,
    });

    expect(waiting).toMatchObject({
      status: 'ready',
      result: { status: 'many' },
    });
  });
});
