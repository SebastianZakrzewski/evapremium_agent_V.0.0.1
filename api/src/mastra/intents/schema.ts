import { z } from 'zod';
import {
  SUB_INTENT_SLUGS,
  TURN_MODES,
} from '../../domain/sub-intent-catalog';

export const SHOP_TOOL_IDS = [
  'resolve-template',
  'quote-price',
  'quote-vehicle',
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
  sub_intent: z.enum(SUB_INTENT_SLUGS).nullable().default(null),
  mode: z.enum(TURN_MODES).default('knowledge'),
  entities: z
    .object({
      car_brand: z.string().optional(),
      car_model: z.string().optional(),
    })
    .default({}),
});

export type QualifyResult = z.infer<typeof qualifyResultSchema>;

export function coarseQualifyResult(
  intent: ShopIntent,
  confidence: number,
): QualifyResult {
  return {
    intent,
    confidence,
    sub_intent: null,
    mode: 'knowledge',
    entities: {},
  };
}

export const QUALIFIER_AGENT_TOOLS: Record<string, never> = {};
