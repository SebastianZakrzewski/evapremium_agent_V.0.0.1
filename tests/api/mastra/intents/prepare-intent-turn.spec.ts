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

  it('does not expose quote-price on product_info', async () => {
    const turn = await prepareIntentTurn(
      qualifier,
      'Czy dywaniki pasują do Golfa 8?',
    );
    const tools = selectTurnTools(shopCatalog, turn.toolIds);

    expect(turn.intent).toBe('product_info');
    expect(profileAllowsTool(turn.toolIds, 'quote-price')).toBe(false);
    expect(tools).not.toHaveProperty('quote-price');
    expect(Object.keys(tools).sort()).toEqual(
      ['lookup-leaf', 'resolve-template', 'search-leaves'].sort(),
    );
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
    expect(turn.executionNote).toContain('Brakuje rocznika');
    expect(turn.fitment?.missing).toBe('year');
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
    expect(turn.toolIds).not.toContain('resolve-template');
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
});
