import { prepareIntentTurn } from './prepare-intent-turn';
import {
  profileAllowsTool,
  selectTurnTools,
} from './select-turn-tools';
import { StubIntentQualifier } from './stub-intent-qualifier';

const shopCatalog = {
  'resolve-template': { id: 'resolve-template' },
  'quote-price': { id: 'quote-price' },
  'lookup-leaf': { id: 'lookup-leaf' },
};

describe('prepareIntentTurn', () => {
  const qualifier = new StubIntentQualifier();

  it('gives pricing the quote-price and resolve-template tools', async () => {
    const turn = await prepareIntentTurn(
      qualifier,
      'Ile kosztują dywaniki do Golfa 8?',
    );
    const tools = selectTurnTools(shopCatalog, turn.toolIds);

    expect(turn.intent).toBe('pricing');
    expect(Object.keys(tools).sort()).toEqual(
      ['quote-price', 'resolve-template'].sort(),
    );
    expect(profileAllowsTool(turn.toolIds, 'quote-price')).toBe(true);
    expect(turn.instructions).toContain(turn.profile.context);
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
      ['lookup-leaf', 'resolve-template'].sort(),
    );
  });

  it('throws when a profile tool is missing from the catalog', () => {
    expect(() =>
      selectTurnTools({ 'lookup-leaf': { id: 'lookup-leaf' } }, [
        'quote-price',
      ]),
    ).toThrow('unknown shop tool: quote-price');
  });
});
