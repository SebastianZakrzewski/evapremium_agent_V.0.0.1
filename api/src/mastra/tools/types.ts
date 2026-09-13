import type { createTool } from '@mastra/core/tools';
import type { ShopToolId } from '../intents/schema';

export type ShopToolCatalog = Record<
  ShopToolId,
  ReturnType<typeof createTool>
>;
