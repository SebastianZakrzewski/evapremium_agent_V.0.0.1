import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { QUOTE_VEHICLE_TOOL } from '../../domain/quote-vehicle-contract';

export function createQuoteVehicleTool() {
  return createTool({
    id: QUOTE_VEHICLE_TOOL,
    description:
      'Jedna wycena auta. Wynik to none, many, need_variant albo quoted. Kwota tylko przy quoted. Składanie kaskady i macierzy nie jest jeszcze podłączone.',
    inputSchema: z.object({
      brand: z.string().optional(),
      model: z.string().optional(),
      bodyType: z.string().optional(),
      year: z.number().optional(),
      variantKey: z.string().optional(),
    }),
    outputSchema: z.object({
      status: z.enum(['none', 'many', 'need_variant', 'quoted']),
    }),
    execute: async () => {
      throw new Error(
        'quote-vehicle skeleton: composition is not implemented',
      );
    },
  });
}
