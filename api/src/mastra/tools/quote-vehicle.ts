import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { AgentEventSink } from '../../agent-events/agent-event';
import { executeShopTool } from '../../agent-events/execute-shop-tool';
import type { ShopTools } from '../../chat/shop-tools';
import { QUOTE_VEHICLE_TOOL } from '../../domain/quote-vehicle-contract';

const matTypeSchema = z.enum(['3d-with-rims', 'classic', 'single']);

const optionSchema = z.object({
  variantKey: z.string(),
  variantLabel: z.string(),
});

export function createQuoteVehicleTool(
  tools: ShopTools,
  events?: AgentEventSink,
) {
  return createTool({
    id: QUOTE_VEHICLE_TOOL,
    description:
      'Jedna wycena auta z kaskady szablonów i macierzy. Wynik: none, many, need_variant, mat_type_required, missing_matrix_row albo quoted. Kwota tylko przy quoted.',
    inputSchema: z.object({
      brand: z.string().optional(),
      model: z.string().optional(),
      bodyType: z.string().optional(),
      year: z.number().optional(),
      variantKey: z.string().optional(),
      matType: matTypeSchema.optional(),
    }),
    outputSchema: z.discriminatedUnion('status', [
      z.object({ status: z.literal('none') }),
      z.object({ status: z.literal('many') }),
      z.object({
        status: z.literal('need_variant'),
        options: z.array(optionSchema),
      }),
      z.object({
        status: z.literal('mat_type_required'),
        matTypes: z.array(matTypeSchema),
      }),
      z.object({ status: z.literal('missing_matrix_row') }),
      z.object({
        status: z.literal('quoted'),
        amount: z.number(),
        currency: z.literal('PLN'),
      }),
    ]),
    execute: async (input) =>
      executeShopTool(events, QUOTE_VEHICLE_TOOL, () =>
        tools.quoteVehicle(input),
      ),
  });
}
