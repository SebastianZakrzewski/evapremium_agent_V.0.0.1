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

  it('resolves pricing instructions and quote-price from request context', () => {
    const ctx = createEvaTurnRequestContext('pricing');
    const profile = profileOrOutOfScope('pricing');

    expect(instructionsForRequestContext(ctx)).toBe(
      assembleTurnInstructions(profile),
    );
    expect(Object.keys(toolsForRequestContext(catalog, ctx)).sort()).toEqual(
      ['quote-price', 'resolve-template'].sort(),
    );
  });

  it('does not expose quote-price for product_info request context', () => {
    const ctx = createEvaTurnRequestContext('product_info');
    const tools = toolsForRequestContext(catalog, ctx);

    expect(tools).not.toHaveProperty('quote-price');
    expect(Object.keys(tools).sort()).toEqual(
      ['lookup-leaf', 'resolve-template'].sort(),
    );
  });
});
