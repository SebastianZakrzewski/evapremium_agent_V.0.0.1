import { Agent } from '@mastra/core/agent';
import { DEEPSEEK_MASTRA_MODEL } from '../create-eva-mastra-agent';
import { QUALIFIER_AGENT_TOOLS } from './schema';

export function createEvaQualifierAgent(): Agent {
  return new Agent({
    id: 'eva-intent-qualifier',
    name: 'EVA intent qualifier',
    instructions:
      'Sklasyfikuj wiadomość klienta sklepu EVA Premium w jednym obiekcie: intent, sub_intent, mode, entities, confidence. Bez SQL. Bez ceny. Bez id szablonu. Bez shop-tooli. Język wiadomości: polski. Intencje: product_info, pricing, delivery, after_sales, out_of_scope. sub_intent: available_colors, material, fitment, delivery_info, indicative_quote, complaint_info albo null. mode: knowledge (pytanie o fakt), action (prośba o wycenę lub dopasowanie), ambiguous. entities: car_brand i car_model tylko gdy padły w tekście. Powitanie → product_info, sub_intent null. Ile kosztują → pricing, indicative_quote, action. Jak liczona jest cena → pricing, knowledge. Dostawa → delivery_info, knowledge. Kolory oferty → available_colors. Reklamacja jako pytanie → complaint_info, knowledge. Kurs walut, konto, płatność → out_of_scope.',
    model: DEEPSEEK_MASTRA_MODEL,
    tools: QUALIFIER_AGENT_TOOLS,
  });
}
