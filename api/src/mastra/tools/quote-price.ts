import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { AgentEventSink } from '../../agent-events/agent-event';
import { executeShopTool } from '../../agent-events/execute-shop-tool';
import type { ShopTools } from '../../chat/shop-tools';

export function createQuotePriceTool(
  tools: ShopTools,
  events?: AgentEventSink,
) {
  return createTool({
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
  });
}
