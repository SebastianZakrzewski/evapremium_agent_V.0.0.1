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
      'Return context tree leaf body by slug. Miss means no fact — do not invent policy.',
    inputSchema: z.object({ slug: z.string() }),
    execute: async ({ slug }) =>
      executeShopTool(events, 'lookup-leaf', () => tools.lookupLeaf(slug)),
  });
}
