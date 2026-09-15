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
      'Return similar context tree slugs for a natural-language question. Each hit has slug, score, and confidence (high or ambiguous). Call at most once per turn. Query should be the customer question. No leaf body — call lookup-leaf next. When confidence is high, one lookup is enough. When ambiguous, pick the slug whose leaf answers the question. Empty means miss.',
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) =>
      executeShopTool(events, 'search-leaves', () => tools.searchLeaves(query)),
  });
}
