import { Agent } from '@mastra/core/agent';
import { DEEPSEEK_MASTRA_MODEL } from '../create-eva-mastra-agent';
import { QUALIFIER_AGENT_TOOLS } from './schema';

export function createEvaQualifierAgent(): Agent {
  return new Agent({
    id: 'eva-intent-qualifier',
    name: 'EVA intent qualifier',
    instructions:
      'Sklasyfikuj wiadomość klienta sklepu EVA Premium. Zwróć tylko intent i confidence. Bez SQL. Bez ceny. Bez id szablonu. Bez shop-tooli. Język wiadomości: polski. Intencje: product_info, pricing, delivery, after_sales, out_of_scope.',
    model: DEEPSEEK_MASTRA_MODEL,
    tools: QUALIFIER_AGENT_TOOLS,
  });
}
