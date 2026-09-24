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
      'Ile kosztują dywaniki Volkswagen Golf 8?',
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
    expect(turn.instructions).toContain('Wykonanie: wywołaj quote-vehicle.');
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
});
