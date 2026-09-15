import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { AgentEventSink } from '../../agent-events/agent-event';
import { executeShopTool } from '../../agent-events/execute-shop-tool';
import type { ShopTools } from '../../chat/shop-tools';

export function createSearchLeavesTool(
  tools: ShopTools,
  events?: AgentEventSink,
) {
  return createTool({
    id: 'search-leaves',
    description:
      'Return similar context tree slugs for a natural-language question. Call at most once per turn. Query should be the customer question. No leaf body — call lookup-leaf next with a slug from this result. Empty means miss.',
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) =>
      executeShopTool(events, 'search-leaves', () => tools.searchLeaves(query)),
  });
}
