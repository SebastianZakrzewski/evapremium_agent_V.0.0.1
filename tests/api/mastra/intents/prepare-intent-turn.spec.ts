import type { FitmentSnapshot } from '@api/domain/fitment-session';
import { resolveTemplate } from '@api/domain/template-cascade';
import {
  CASCADE_ALIASES,
  CASCADE_TEMPLATES,
} from '@api/templates/in-memory/cascade-fixture';
import {
  assembleTurnInstructions,
  prepareIntentTurn,
} from '@api/mastra/intents/prepare-intent-turn';
import { intentProfileFor } from '@api/mastra/intents/profiles';
import {
  profileAllowsTool,
  selectTurnTools,
} from '@api/mastra/intents/select-turn-tools';
import { StubIntentQualifier } from '@api/mastra/intents/stub-intent-qualifier';

const shopCatalog = {
  'resolve-template': { id: 'resolve-template' },
  'quote-price': { id: 'quote-price' },
  'quote-vehicle': { id: 'quote-vehicle' },
  'lookup-leaf': { id: 'lookup-leaf' },
  'search-leaves': { id: 'search-leaves' },
};

describe('prepareIntentTurn', () => {
  const qualifier = new StubIntentQualifier();

  it('gives a complete pricing turn the quote-vehicle tool', async () => {
    const turn = await prepareIntentTurn(
      qualifier,
      'Ile kosztują dywaniki Volkswagen Golf 8 kombi 2019?',
    );
    const tools = selectTurnTools(shopCatalog, turn.toolIds);

    expect(turn.intent).toBe('pricing');
    expect(turn.execution).toEqual({
      kind: 'tool',
      tool: 'quote-vehicle',
      tools: ['quote-vehicle'],
    });
    expect(Object.keys(tools)).toEqual(['quote-vehicle']);
    expect(profileAllowsTool(turn.toolIds, 'quote-vehicle')).toBe(true);
    expect(turn.instructions).toContain('Wykonanie: wywołaj quote-vehicle');
    expect(turn.instructions).toContain('year=2019');
    expect(turn.instructions).toContain('bodyType="kombi"');
  });

  it('holds quote tools until the vehicle workflow has both slots', async () => {
    const turn = await prepareIntentTurn(
      qualifier,
      'Ile kosztują dywaniki do Golfa 8?',
    );

    expect(turn.intent).toBe('pricing');
    expect(turn.execution.kind).toBe('workflow');
    expect(turn.toolIds).toEqual([]);
    expect(turn.quoteWorkflow?.step).toBe('waiting_for_vehicle');
    expect(turn.instructions).toContain('Brakuje marki auta');
  });

  it('starts the fitment cascade when the question names a model', async () => {
    const turn = await prepareIntentTurn(
      qualifier,
      'Czy dywaniki pasują do Golfa 8?',
    );

    expect(turn.intent).toBe('product_info');
    expect(turn.execution).toEqual({
      kind: 'workflow',
      workflow: 'fitment_cascade',
    });
    expect(turn.toolIds).toEqual([]);
    expect(turn.executionNote).toContain('Brakuje marki auta');
    expect(turn.executionNote).toContain('model=Golf 8');
    expect(profileAllowsTool(turn.toolIds, 'quote-price')).toBe(false);
    expect(profileAllowsTool(turn.toolIds, 'resolve-template')).toBe(false);
  });

  it('gives delivery search-leaves and lookup-leaf without quote-price', async () => {
    const turn = await prepareIntentTurn(
      qualifier,
      'Jaki jest termin dostawy?',
    );
    const tools = selectTurnTools(shopCatalog, turn.toolIds);

    expect(turn.intent).toBe('delivery');
    expect(Object.keys(tools).sort()).toEqual(
      ['lookup-leaf', 'search-leaves'].sort(),
    );
    expect(turn.instructions).toContain('search-leaves');
    expect(turn.instructions).toContain('Miss');
    expect(tools).not.toHaveProperty('quote-price');
  });

  it('throws when a profile tool is missing from the catalog', () => {
    expect(() =>
      selectTurnTools({ 'lookup-leaf': { id: 'lookup-leaf' } }, [
        'quote-price',
      ]),
    ).toThrow('unknown shop tool: quote-price');
  });

  it('adds dataset few-shot lines for delivery and after_sales profiles', () => {
    const delivery = intentProfileFor('delivery');
    const afterSales = intentProfileFor('after_sales');
    expect(delivery).toBeDefined();
    expect(afterSales).toBeDefined();
    const deliveryText = assembleTurnInstructions(delivery!);
    const afterText = assembleTurnInstructions(afterSales!);
    expect(deliveryText).toContain('dostawa');
    expect(deliveryText).toContain('czas-produkcji');
    expect(afterText).toContain('gwarancja');
    expect(deliveryText).toContain('confidence=high');
    expect(deliveryText).not.toContain('od najwyższego score');
  });

  it('runs the cascade workflow for a fitment action and suspends on body', async () => {
    const turn = await prepareIntentTurn(
      qualifier,
      'Chcę dopasować dywaniki do VW Golf 8',
      {
        cascade: {
          resolve: (input) =>
            Promise.resolve(
              resolveTemplate(input, CASCADE_TEMPLATES, CASCADE_ALIASES),
            ),
          listAliases: () => CASCADE_ALIASES,
        },
      },
    );

    expect(turn.execution).toEqual({
      kind: 'workflow',
      workflow: 'fitment_cascade',
    });
    expect(turn.toolIds).toEqual([]);
    expect(turn.executionNote).toContain('Brakuje typu nadwozia');
    expect(turn.executionNote).toContain('hatchback');
    expect(turn.executionNote).toContain('wagon');
    expect(turn.fitment?.missing).toBe('body_type');
  });

  it('resumes a saved fitment with the body reply and does not requalify', async () => {
    const fitment: FitmentSnapshot = {
      workflow: 'fitment_cascade',
      step: 'waiting_for_vehicle',
      missing: 'body_type',
      slots: { car_brand: 'vw', car_model: 'golf 8', year: 2021 },
    };
    const qualifier = {
      qualify: async () => {
        throw new Error('should not qualify');
      },
    };
    const turn = await prepareIntentTurn(qualifier, 'hatcback', {
      fitment,
      cascade: {
        resolve: (input) =>
          Promise.resolve(
            resolveTemplate(input, CASCADE_TEMPLATES, CASCADE_ALIASES),
          ),
        listAliases: () => CASCADE_ALIASES,
      },
    });

    expect(turn.clearFitment).toBe(true);
    expect(turn.execution.kind).toBe('knowledge');
    expect(turn.executionNote).toContain('Kaskada: one');
    expect(turn.executionNote).toContain('body=hatchback');
    expect(turn.verifiedProduct).toEqual({
      productId: 'passenger_car|volkswagen|golfmk8_8_gen|2019-|hatchback|1',
      fields: {
        brand_key: 'Volkswagen',
        model_key: 'Golf(MK8) 8 gen',
        body_type_key: 'hatchback',
        year_from: '2019',
      },
    });
    expect(turn.toolIds).not.toContain('resolve-template');
  });

  it('keeps brand and model from a knowledge fitment when the year arrives next', async () => {
    const first = await prepareIntentTurn(
      {
        qualify: async () => ({
          intent: 'product_info',
          confidence: 0.95,
          sub_intent: 'fitment',
          mode: 'knowledge',
          entities: { car_brand: 'BMW', car_model: 'X5' },
        }),
      },
      'Czy posiadacie dywaniki do BMW X5 ?',
    );

    expect(first.execution).toEqual({
      kind: 'workflow',
      workflow: 'fitment_cascade',
    });
    expect(first.toolIds).toEqual([]);
    expect(first.fitment?.missing).toBe('year');
    expect(first.fitment?.slots).toEqual({ car_brand: 'BMW', car_model: 'X5' });

    const second = await prepareIntentTurn(
      {
        qualify: async () => {
          throw new Error('should not qualify');
        },
      },
      '2021 rok',
      { fitment: first.fitment },
    );

    expect(second.entities).toMatchObject({
      car_brand: 'BMW',
      car_model: 'X5',
      year: 2021,
    });
    expect(second.fitment?.missing).toBe('body_type');
    expect(second.executionNote).toContain('marka=BMW');
    expect(second.executionNote).toContain('model=X5');
    expect(second.executionNote).toContain('rocznik=2021');
  });

  it('drops a saved fitment when the next message is a new question', async () => {
    const fitment: FitmentSnapshot = {
      workflow: 'fitment_cascade',
      step: 'waiting_for_vehicle',
      missing: 'body_type',
      slots: { car_brand: 'vw', car_model: 'golf 8', year: 2021 },
    };
    const turn = await prepareIntentTurn(
      qualifier,
      'Jakie macie kolory?',
      { fitment },
    );

    expect(turn.clearFitment).toBe(true);
    expect(turn.intent).toBe('product_info');
  });

  it('reuses a resolved session car when the follow-up does not name a vehicle', async () => {
    const turn = await prepareIntentTurn(
      {
        qualify: async () => ({
          intent: 'product_info',
          confidence: 0.9,
          sub_intent: null,
          mode: 'knowledge',
          entities: { car_brand: 'juz podalem' },
        }),
      },
      'juz podalem',
      {
        knownVehicle: {
          carBrand: 'Toyota',
          carModel: 'RAV 4',
          year: 2021,
          bodyType: 'suv',
          cascadeStatus: 'one',
          brandKey: 'Toyota ',
          modelKey: 'Rav4 (XA50) 5 gen',
          bodyTypeKey: 'suv',
          templateRecordKey: 'passenger_car|toyota|rav4_xa50_5_gen|2019-2026|suv|2554',
        },
      },
    );

    expect(turn.execution.kind).toBe('knowledge');
    expect(turn.executionNote).toContain('marka=Toyota');
    expect(turn.executionNote).toContain('recordKey=passenger_car|toyota|rav4_xa50_5_gen|2019-2026|suv|2554');
    expect(turn.executionNote).toContain('Nie pytaj ponownie');
    expect(turn.entities.car_brand).toBe('Toyota');
    expect(turn.collectedSlots?.car_brand).toBe('Toyota');
    expect(turn.verifiedProduct).toEqual({
      productId: 'passenger_car|toyota|rav4_xa50_5_gen|2019-2026|suv|2554',
      fields: {
        brand_key: 'Toyota',
        model_key: 'Rav4 (XA50) 5 gen',
        body_type_key: 'suv',
      },
    });
  });

  it.each(['Acura', 'Toyota', 'BMW', 'Audi', 'Skoda', 'Volkswagen'])(
    'asks for the model when only the brand %s is known',
    async (brand) => {
      const message = `dywaniki do ${brand}`;
      const turn = await prepareIntentTurn(
        {
          qualify: async () => ({
            intent: 'product_info',
            confidence: 0.95,
            sub_intent: 'fitment',
            mode: 'action',
            entities: { car_brand: brand },
          }),
        },
        message,
      );

      expect(turn.entities.car_model).toBeUndefined();
      expect(turn.entities.car_brand).toBe(brand);
      expect(turn.fitment?.missing).toBe('car_model');
      expect(turn.executionNote).toContain('Brakuje modelu auta');
      expect(turn.executionNote).toContain(`marka=${brand}`);
      expect(turn.executionNote).not.toContain(`model=${message}`);
    },
  );

  it('keeps a spoken year and still asks for the model', async () => {
    const turn = await prepareIntentTurn(
      {
        qualify: async () => ({
          intent: 'product_info',
          confidence: 0.95,
          sub_intent: 'fitment',
          mode: 'action',
          entities: { car_brand: 'Acura' },
        }),
      },
      'dywaniki do Acura 2021',
    );

    expect(turn.entities.car_model).toBeUndefined();
    expect(turn.entities.year).toBe(2021);
    expect(turn.fitment?.missing).toBe('car_model');
  });
});
