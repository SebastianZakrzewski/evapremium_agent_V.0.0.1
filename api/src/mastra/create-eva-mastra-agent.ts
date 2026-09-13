import { Agent } from '@mastra/core/agent';
import { z } from 'zod';
import {
  instructionsForRequestContext,
  toolsForRequestContext,
} from './eva-turn-request-context';
import { shopIntentSchema } from './intents/schema';
import type { ShopToolCatalog } from './tools';

export const DEEPSEEK_MASTRA_MODEL = 'deepseek/deepseek-v4-flash';
export const EVA_SHOP_AGENT_ID = 'eva-shop-agent';
export const EVA_SHOP_AGENT_KEY = 'evaShopAgent' as const;

export function createEvaMastraAgent(catalog: ShopToolCatalog): Agent {
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
