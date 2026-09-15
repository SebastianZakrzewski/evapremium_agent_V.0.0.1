import { Agent } from '@mastra/core/agent';
import { DEEPSEEK_MASTRA_MODEL } from '../create-eva-mastra-agent';
import { QUALIFIER_AGENT_TOOLS } from './schema';

export function createEvaQualifierAgent(): Agent {
  return new Agent({
    id: 'eva-intent-qualifier',
    name: 'EVA intent qualifier',
    instructions:
      'Sklasyfikuj wiadomość klienta sklepu EVA Premium. Zwróć tylko intent i confidence. Bez SQL. Bez ceny. Bez id szablonu. Bez shop-tooli. Język wiadomości: polski. Intencje: product_info, pricing, delivery, after_sales, out_of_scope. Powitanie (cześć, hej, dzień dobry, witam) → product_info. Chcę dobrać dywaniki / materiał / kolory → product_info. Ile kosztują → pricing. Dostawa / kiedy wyślecie → delivery. Gwarancja / pielęgnacja / czyszczenie → after_sales. Kurs walut, konto, płatność, zwrot środków → out_of_scope.',
    model: DEEPSEEK_MASTRA_MODEL,
    tools: QUALIFIER_AGENT_TOOLS,
  });
}
