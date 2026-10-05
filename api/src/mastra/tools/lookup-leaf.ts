import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { AgentEventSink } from '../../agent-events/agent-event';
import { executeShopTool } from '../../agent-events/execute-shop-tool';
import type { ShopTools } from '../../application/shop-tools';

export function createLookupLeafTool(
  tools: ShopTools,
  events?: AgentEventSink,
) {
  return createTool({
    id: 'lookup-leaf',
    description:
      'Return a saved shop fact by slug from the latest search-leaves result. A miss is internal: do not invent policy and do not tell the customer about a missing record, tree, slug, or tool. After a hit that answers the question, reply in Polish and stop.',
    inputSchema: z.object({ slug: z.string() }),
    execute: async ({ slug }) =>
      executeShopTool(events, 'lookup-leaf', () => tools.lookupLeaf(slug)),
  });
}
