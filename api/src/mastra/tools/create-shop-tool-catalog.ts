import type { AgentEventSink } from '../../agent-events/agent-event';
import type { ShopTools } from '../../chat/shop-tools';
import { createLookupLeafTool } from './lookup-leaf';
import { createQuotePriceTool } from './quote-price';
import { createQuoteVehicleTool } from './quote-vehicle';
import { createResolveTemplateTool } from './resolve-template';
import { createSearchLeavesTool } from './search-leaves';
import type { ShopToolCatalog } from './types';

export function createShopToolCatalog(
  tools: ShopTools,
  events?: AgentEventSink,
): ShopToolCatalog {
  return {
    'resolve-template': createResolveTemplateTool(tools, events),
    'quote-price': createQuotePriceTool(tools, events),
    'quote-vehicle': createQuoteVehicleTool(tools, events),
    'lookup-leaf': createLookupLeafTool(tools, events),
    'search-leaves': createSearchLeavesTool(tools, events),
  };
}
