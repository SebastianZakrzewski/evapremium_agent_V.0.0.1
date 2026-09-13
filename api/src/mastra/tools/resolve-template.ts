import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { AgentEventSink } from '../../agent-events/agent-event';
import { executeShopTool } from '../../agent-events/execute-shop-tool';
import type { ShopTools } from '../../chat/shop-tools';

export function createResolveTemplateTool(
  tools: ShopTools,
  events?: AgentEventSink,
) {
  return createTool({
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
  });
}
