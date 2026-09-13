import { z } from 'zod';

export const SHOP_TOOL_IDS = [
  'resolve-template',
  'quote-price',
  'lookup-leaf',
  'search-leaves',
] as const;

export type ShopToolId = (typeof SHOP_TOOL_IDS)[number];

export const shopIntentSchema = z.enum([
  'product_info',
  'pricing',
  'delivery',
  'after_sales',
  'out_of_scope',
]);

export type ShopIntent = z.infer<typeof shopIntentSchema>;

export const qualifyResultSchema = z.object({
  intent: shopIntentSchema,
  confidence: z.number().min(0).max(1),
});

export type QualifyResult = z.infer<typeof qualifyResultSchema>;

export const QUALIFIER_AGENT_TOOLS: Record<string, never> = {};
