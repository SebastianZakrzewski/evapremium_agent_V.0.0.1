import { RequestContext } from '@mastra/core/request-context';
import {
  createEvaTurnRequestContext,
  instructionsForRequestContext,
  shopIntentFromContext,
  toolsForRequestContext,
} from './eva-turn-request-context';
import { assembleTurnInstructions } from './intents/prepare-intent-turn';
import { profileOrOutOfScope } from './intents/intent-fallback';

const catalog = {
  'resolve-template': { id: 'resolve-template' },
  'quote-price': { id: 'quote-price' },
  'lookup-leaf': { id: 'lookup-leaf' },
  'search-leaves': { id: 'search-leaves' },
};

describe('eva turn request context', () => {
  it('stores ShopIntent for interpolation and display conditions', () => {
    const ctx = createEvaTurnRequestContext('pricing');

    expect(ctx.get('intent')).toBe('pricing');
    expect(shopIntentFromContext(ctx)).toBe('pricing');
  });

  it('defaults missing intent to out_of_scope', () => {
    const ctx = new RequestContext<{ intent?: 'pricing' }>();

    expect(shopIntentFromContext(ctx)).toBe('out_of_scope');
  });

  it('resolves pricing instructions and quote-price from request context', async () => {
    const ctx = createEvaTurnRequestContext('pricing');
    const profile = profileOrOutOfScope('pricing');

    expect(await instructionsForRequestContext(ctx)).toBe(
      assembleTurnInstructions(profile),
    );
    expect(Object.keys(toolsForRequestContext(catalog, ctx)).sort()).toEqual(
      ['quote-price', 'resolve-template'].sort(),
    );
  });

  it('uses published prompt-blocks instead of the intent profile prompt', async () => {
    const ctx = createEvaTurnRequestContext('pricing');
    const mastra = {
      getEditor: () => ({
        prompt: {
          listResolved: async () => ({
            promptBlocks: [{ id: 'evapremium-agent-v-0-0-1' }],
          }),
          preview: async (
            blocks: Array<{ id: string }>,
            context: Record<string, unknown>,
          ) => {
            expect(blocks).toEqual([
              { type: 'prompt_block_ref', id: 'evapremium-agent-v-0-0-1' },
            ]);
            expect(context).toEqual({ intent: 'pricing' });
            return 'prompt ze Studio';
          },
        },
      }),
    };

    await expect(instructionsForRequestContext(ctx, mastra)).resolves.toBe(
      'prompt ze Studio',
    );
  });

  it('does not expose quote-price for product_info request context', () => {
    const ctx = createEvaTurnRequestContext('product_info');
    const tools = toolsForRequestContext(catalog, ctx);

    expect(tools).not.toHaveProperty('quote-price');
    expect(Object.keys(tools).sort()).toEqual(
      ['lookup-leaf', 'resolve-template', 'search-leaves'].sort(),
    );
  });
});
