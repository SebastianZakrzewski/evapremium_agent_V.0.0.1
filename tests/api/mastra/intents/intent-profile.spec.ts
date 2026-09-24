import { SHOP_TOOL_IDS } from '@api/mastra/intents/schema';
import { intentProfileFor } from '@api/mastra/intents/profiles';

const allowedTools = new Set<string>(SHOP_TOOL_IDS);

describe('intentProfileFor', () => {
  it('returns product_info with context and allowed shop tools', () => {
    const profile = intentProfileFor('product_info');

    expect(profile).toBeDefined();
    expect(profile?.id).toBe('product_info');
    expect(profile?.context.trim().length).toBeGreaterThan(0);
    expect(profile?.tools).toEqual(
      expect.arrayContaining([
        'resolve-template',
        'lookup-leaf',
        'search-leaves',
      ]),
    );
    expect(profile?.tools).toHaveLength(3);
    for (const tool of profile?.tools ?? []) {
      expect(allowedTools.has(tool)).toBe(true);
    }
    expect(profile?.tools).not.toContain('quote-price');
    expect(profile?.instructions).toContain('Samo powitanie');
  });

  it('returns undefined for an unknown intent', () => {
    expect(intentProfileFor('not_an_intent')).toBeUndefined();
  });

  it('fills every known ShopIntent with allowed tools only', () => {
    const known = [
      'product_info',
      'pricing',
      'delivery',
      'after_sales',
      'out_of_scope',
    ] as const;

    for (const intent of known) {
      const profile = intentProfileFor(intent);
      expect(profile?.id).toBe(intent);
      expect(profile?.context.trim().length).toBeGreaterThan(0);
      expect(profile?.execution.mode).toBe('agent_loop');
      expect(profile?.fallback.onUnknownCase).toBe('out_of_scope');
      for (const tool of profile?.tools ?? []) {
        expect(allowedTools.has(tool)).toBe(true);
      }
    }

    expect(intentProfileFor('out_of_scope')?.tools).toEqual([]);
    expect(intentProfileFor('delivery')?.execution.maxToolCalls).toBe(4);
    expect(intentProfileFor('after_sales')?.execution.maxToolCalls).toBe(4);
    expect(intentProfileFor('delivery')?.instructions).toContain(
      'najwyżej raz',
    );
    expect(intentProfileFor('pricing')?.tools).toEqual(['quote-vehicle']);
    expect(intentProfileFor('pricing')?.tools).not.toContain('search-leaves');
    expect(intentProfileFor('delivery')?.tools.sort()).toEqual(
      ['lookup-leaf', 'search-leaves'].sort(),
    );
  });
});
