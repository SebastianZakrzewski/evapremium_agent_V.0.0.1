import { executeQualifyStep } from '@api/mastra/intents/qualify-step';
import { MastraIntentQualifier } from '@api/mastra/intents/mastra-intent-qualifier';
import { QUALIFIER_AGENT_TOOLS, qualifyResultSchema } from '@api/mastra/intents/schema';
import { StubIntentQualifier } from '@api/mastra/intents/stub-intent-qualifier';

describe('StubIntentQualifier', () => {
  const qualifier = new StubIntentQualifier();

  it('maps a price question to pricing ShopIntent', async () => {
    const result = await qualifier.qualify(
      'Ile kosztują dywaniki do Golfa 8?',
    );
    expect(qualifyResultSchema.parse(result)).toEqual({
      intent: 'pricing',
      confidence: 1,
      sub_intent: 'indicative_quote',
      mode: 'action',
      entities: { car_model: 'Golf 8' },
    });
  });

  it('maps a fit question to product_info', async () => {
    const result = await qualifier.qualify('Czy dywaniki pasują do Golfa 8?');
    expect(result.intent).toBe('product_info');
  });

  it('maps unknown copy to out_of_scope', async () => {
    const result = await qualifier.qualify('jaki jest kurs euro');
    expect(result.intent).toBe('out_of_scope');
  });

  it('maps a greeting to product_info', async () => {
    const result = await qualifier.qualify('Dzień dobry');
    expect(result.intent).toBe('product_info');
  });
});

describe('MastraIntentQualifier', () => {
  it('parses structured generate output through qualifyResultSchema', async () => {
    const qualifier = new MastraIntentQualifier({
      generate: async () => ({
        object: { intent: 'delivery', confidence: 0.9 },
      }),
    });
    await expect(qualifier.qualify('kiedy wysyłka')).resolves.toEqual({
      intent: 'delivery',
      confidence: 0.9,
      sub_intent: null,
      mode: 'knowledge',
      entities: {},
    });
  });

  it('rejects generate output that is not a ShopIntent', async () => {
    const qualifier = new MastraIntentQualifier({
      generate: async () => ({
        object: { intent: 'general_agent', confidence: 1 },
      }),
    });
    await expect(qualifier.qualify('cokolwiek')).rejects.toThrow();
  });
});

describe('qualifier agent tools', () => {
  it('exposes an empty shop-tool map', () => {
    expect(QUALIFIER_AGENT_TOOLS).toEqual({});
  });
});

describe('executeQualifyStep', () => {
  it('returns ShopIntent from the qualifier without calling shop tools', async () => {
    const result = await executeQualifyStep(new StubIntentQualifier(), {
      message: 'Ile kosztują dywaniki do Golfa 8?',
    });
    expect(result).toEqual({
      intent: 'pricing',
      confidence: 1,
      sub_intent: 'indicative_quote',
      mode: 'action',
      entities: { car_model: 'Golf 8' },
    });
  });
});
