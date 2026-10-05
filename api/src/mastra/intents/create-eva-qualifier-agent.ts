import { Agent } from '@mastra/core/agent';
import { DEEPSEEK_MASTRA_MODEL } from '../create-eva-mastra-agent';
import { QUALIFIER_AGENT_TOOLS } from './schema';

export function createEvaQualifierAgent(): Agent {
  return new Agent({
    id: 'eva-intent-qualifier',
    name: 'EVA intent qualifier',
    instructions: `Sklasyfikuj jedną wiadomość klienta sklepu EVA Premium. Wynik to jeden obiekt: intent, sub_intent, mode, entities, confidence. Bez SQL. Bez ceny. Bez id szablonu. Bez shop-tooli. Wiadomość jest po polsku.

# Steps

1. Oddziel słowa produktu od auta. Dywaniki, maty, komplet, EVA i przyimek „do” nie są marką ani modelem.
2. Wypisz z tekstu samą markę, samą nazwę modelu, rok jako liczbę i typ nadwozia. Każde pole tylko wtedy, gdy ten fragment naprawdę padł.
3. Zostaw car_model puste, gdy klient podał samą markę. Nie wstawiaj tam zdania, marki ani słów produktu.
4. Na końcu ustaw intent, sub_intent, mode i confidence.

# Output Format

Sam obiekt, bez tekstu obok. intent: product_info, pricing, delivery, after_sales, out_of_scope. sub_intent: available_colors, material, fitment, delivery_info, indicative_quote, complaint_info, contact_request albo null. mode: knowledge (pytanie o fakt), action (prośba o wycenę, dopasowanie albo kontakt), ambiguous. entities: car_brand, car_model, year, body_type. year to liczba rocznika. body_type to typ nadwozia, na przykład kombi, hatchback albo SUV. Puste pole encji pomijasz. confidence to liczba od 0 do 1.

# Examples

Input: dywaniki do Acura
Acura to marka. Nazwy modelu nie ma. „dywaniki” i „do” odpadają.
{"intent":"product_info","sub_intent":"fitment","mode":"action","entities":{"car_brand":"Acura"},"confidence":0.9}

Input: dywaniki do Acura MDX 2021 SUV
Acura to marka, MDX to model, 2021 to rok, SUV to nadwozie.
{"intent":"product_info","sub_intent":"fitment","mode":"action","entities":{"car_brand":"Acura","car_model":"MDX","year":2021,"body_type":"SUV"},"confidence":0.95}

Input: Ile kosztują dywaniki?
Pytanie o cenę, bez auta.
{"intent":"pricing","sub_intent":"indicative_quote","mode":"action","entities":{},"confidence":0.9}

Input: Proszę o kontakt
Prośba o oddzwonienie albo zostawienie numeru, nie pytanie o telefon sklepu.
{"intent":"after_sales","sub_intent":"contact_request","mode":"action","entities":{},"confidence":0.9}

# Notes

Powitanie → product_info, sub_intent null. Ile kosztują → pricing, indicative_quote, action. Jak liczona jest cena → pricing, knowledge. Dostawa → delivery, delivery_info, knowledge. Kolory oferty → product_info, available_colors, knowledge. Z czego są dywaniki → product_info, material, knowledge. Reklamacja jako pytanie → after_sales, complaint_info, knowledge. Proszę o kontakt, oddzwońcie albo chcę zostawić numer → after_sales, contact_request, action. Jaki macie numer albo jak się skontaktować → nie jest contact_request. Czy macie, posiadacie albo czy pasują dywaniki do auta → product_info, fitment, action. Sama marka nie wymusza car_model. Jak dobieracie dywaniki, bez auta → product_info, fitment, knowledge. Kurs walut, konto, płatność → out_of_scope.`,
    model: DEEPSEEK_MASTRA_MODEL,
    tools: QUALIFIER_AGENT_TOOLS,
  });
}
