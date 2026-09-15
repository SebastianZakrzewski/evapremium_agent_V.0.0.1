import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { AgentEventSink } from '../../agent-events/agent-event';
import { executeShopTool } from '../../agent-events/execute-shop-tool';
import type { ShopTools } from '../../chat/shop-tools';

export function createLookupLeafTool(
  tools: ShopTools,
  events?: AgentEventSink,
) {
  return createTool({
    id: 'lookup-leaf',
    description:
      'Return context tree leaf body by slug from the latest search-leaves result. Miss means no fact — do not invent policy. After a hit that answers the question, reply and stop.',
    inputSchema: z.object({ slug: z.string() }),
    execute: async ({ slug }) =>
      executeShopTool(events, 'lookup-leaf', () => tools.lookupLeaf(slug)),
  });
}
