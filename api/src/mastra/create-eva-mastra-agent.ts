import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { AgentEventSink } from '../agent-events/agent-event';
import { executeShopTool } from '../agent-events/execute-shop-tool';
import type { ShopTools } from '../chat/shop-tools';
import {
  instructionsForRequestContext,
  toolsForRequestContext,
} from './eva-turn-request-context';
import { shopIntentSchema, type ShopToolId } from './intents/schema';

export const DEEPSEEK_MASTRA_MODEL = 'deepseek/deepseek-v4-flash';
export const EVA_SHOP_AGENT_ID = 'eva-shop-agent';
export const EVA_SHOP_AGENT_KEY = 'evaShopAgent' as const;

function shopToolCatalog(tools: ShopTools, events?: AgentEventSink) {
  return {
    'resolve-template': createTool({
      id: 'resolve-template',
      description:
        'Resolve vehicle slots to mat_templates. Returns none, one, or many. Never invent a price.',
      inputSchema: z.object({
        brand: z.string().optional(),
        model: z.string().optional(),
        bodyType: z.string().optional(),
        year: z.number().optional(),
        recordKey: z.string().optional(),
      }),
      execute: async (input) =>
        executeShopTool(events, 'resolve-template', () =>
          tools.resolveTemplate(input),
        ),
    }),
    'quote-price': createTool({
      id: 'quote-price',
      description:
        'Return one amount from pricing_matrix for a category variant. Domain errors have no amount.',
      inputSchema: z.object({
        dealerPricingCategoryKey: z.string(),
        variantKey: z.string(),
        matType: z.enum(['3d-with-rims', 'classic', 'single']).optional(),
      }),
      execute: async (input) =>
        executeShopTool(events, 'quote-price', () => tools.quotePrice(input)),
    }),
    'lookup-leaf': createTool({
      id: 'lookup-leaf',
      description:
        'Return context tree leaf body by slug. Miss means no fact — do not invent policy.',
      inputSchema: z.object({ slug: z.string() }),
      execute: async ({ slug }) =>
        executeShopTool(events, 'lookup-leaf', () => tools.lookupLeaf(slug)),
    }),
    'search-leaves': createTool({
      id: 'search-leaves',
      description:
        'Return similar context tree slugs for a natural-language question. No leaf body — call lookup-leaf next. Empty means miss.',
      inputSchema: z.object({ query: z.string() }),
      execute: async ({ query }) =>
        executeShopTool(events, 'search-leaves', () =>
          tools.searchLeaves(query),
        ),
    }),
  } satisfies Record<ShopToolId, ReturnType<typeof createTool>>;
}

export function createEvaMastraAgent(
  tools: ShopTools,
  events?: AgentEventSink,
): Agent {
  const catalog = shopToolCatalog(tools, events);
  return new Agent({
    id: EVA_SHOP_AGENT_ID,
    name: 'EVA Premium',
    instructions: ({ requestContext, mastra }) =>
      instructionsForRequestContext(requestContext, mastra),
    model: DEEPSEEK_MASTRA_MODEL,
    tools: ({ requestContext }) =>
      toolsForRequestContext(catalog, requestContext),
    requestContextSchema: z.object({
      intent: shopIntentSchema.optional(),
    }),
  });
}
