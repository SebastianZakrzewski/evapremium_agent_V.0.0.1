import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { AgentEventSink } from '../../agent-events/agent-event';
import { executeShopTool } from '../../agent-events/execute-shop-tool';
import type { ShopTools } from '../../application/shop-tools';

export function createSearchLeavesTool(
  tools: ShopTools,
  events?: AgentEventSink,
) {
  return createTool({
    id: 'search-leaves',
    description:
      'Return similar saved-fact slugs for a natural-language question. Each hit has slug, score, and confidence (high or ambiguous). Call at most once per turn. Query should be the customer question. No fact body — call lookup-leaf next. When confidence is high, one lookup is enough. When ambiguous, pick the slug whose fact answers the question. An empty list is internal: do not invent policy and do not tell the customer the record is missing.',
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) =>
      executeShopTool(events, 'search-leaves', () => tools.searchLeaves(query)),
  });
}
