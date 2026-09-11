import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import type { ShopTools } from '../chat/shop-tools';

export const DEEPSEEK_MASTRA_MODEL = 'deepseek/deepseek-v4-flash';

export function createEvaMastraAgent(tools: ShopTools): Agent {
  const resolveTemplateTool = createTool({
    id: 'resolve-template',
    description:
      'Resolve vehicle slots to mat_templates. Returns none, one, or many. Never invent a price.',
    inputSchema: z.object({
      brand: z.string().optional(),
      model: z.string().optional(),
      bodyType: z.string().optional(),
      year: z.number().optional(),
      recordKey: z.string().optional(),
    }),
    execute: async (input) => tools.resolveTemplate(input),
  });

  const quotePriceTool = createTool({
    id: 'quote-price',
    description:
      'Return one amount from pricing_matrix for a category variant. Domain errors have no amount.',
    inputSchema: z.object({
      dealerPricingCategoryKey: z.string(),
      variantKey: z.string(),
      matType: z.enum(['3d-with-rims', 'classic', 'single']).optional(),
    }),
    execute: async (input) => tools.quotePrice(input),
  });

  const lookupLeafTool = createTool({
    id: 'lookup-leaf',
    description:
      'Return context tree leaf body by slug. Miss means no fact — do not invent policy.',
    inputSchema: z.object({ slug: z.string() }),
    execute: async ({ slug }) => tools.lookupLeaf(slug),
  });

  return new Agent({
    id: 'eva-shop-agent',
    name: 'EVA Premium',
    instructions:
      'Język: polski. Cena i fakt tylko z narzędzi Nest. Bez SQL. Bez kwoty spoza quote-price. Bez faktu spoza lookup-leaf.',
    model: DEEPSEEK_MASTRA_MODEL,
    tools: {
      resolveTemplateTool,
      quotePriceTool,
      lookupLeafTool,
    },
  });
}
