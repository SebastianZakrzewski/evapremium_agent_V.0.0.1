# Router wykonania agenta

Źródło prawdy granic: `ARCHITECTURE.md`. Przepływ intencji (profil, krawędzie):
`docs/design-docs/intent-workflow.md`. Retrieval liścia:
`docs/design-docs/context-leaf-hybrid-retrieval.md`.
Plan: `docs/exec-plans/active/agent-execution-router.md`.

## Cel

Jedno wywołanie modelu rozumie wiadomość. Backend wybiera ścieżkę wykonania.
Model pisze odpowiedź klientowi. Nie on decyduje, czy to wiedza, tool czy proces.

Zakres rodziców: `product_info`, `pricing`, `delivery`, `after_sales`.
Brak tooli zamówień, konta, checkout i płatności.

## Kontrakt kwalifikacji

Jedno wywołanie, zero shop-tooli, zwraca:

| Pole | Znaczenie |
| --- | --- |
| `intent` | Szeroki obszar (`ShopIntent`) |
| `sub_intent` | Slug z katalogu albo `null` |
| `mode` | `knowledge` (fakt), `action` (zrób), `ambiguous` |
| `entities` | `car_brand`, `car_model` — parametry, nie intencja |
| `confidence` | Próg `LOW_INTENT_CONFIDENCE` bez zmian |

Niska pewność: jedno `reclassify`, potem `out_of_scope`. Błąd kwalifikatora
→ `out_of_scope`.

## Katalog sub-intencji

Obiekt, nie sam string: `slug`, `name`, `description`, `parentIntent`,
`examples.knowledge`, `examples.action`, `negativeExamples`,
`relatedBranches`, `allowedModes`, `allowedTools`, `directTool`,
`requiredInputs`, `fallbackWorkflow`.

`relatedBranches` to miękki bonus przy retrievalu gałęzi. Nie filtr
„szukaj tylko tu”. `related` slugi nie są krawędziami maszyny stanów.
`allowedTransitions` zostaje strażnikiem grubej intencji sesji.

Pierwsze slugi: `available_colors`, `material`, `fitment`, `delivery_info`,
`indicative_quote`, `complaint_info`.

## Execution router

Czysta funkcja `chooseExecution` po kwalifikacji:

| Warunek | Ścieżka |
| --- | --- |
| brak sub-intencji | toole profilu intencji (dotychczasowa pętla) |
| `mode = knowledge` | `lookup-leaf` / `search-leaves` z allowlisty sub-intencji |
| `mode = action` i komplet `requiredInputs` | `directTool` (allowlista sub-intencji) |
| `mode = action` i brak pól, jest `fallbackWorkflow` | workflow, zero shop-tooli w tej turze |
| `ambiguous` albo mode spoza `allowedModes` | dopytanie, zero shop-tooli |

„Czy pola są kompletne?” nie idzie do modelu. Cena i fakt nadal z Nest.

`indicative_quote`: `directTool = quote-vehicle`, wymagane `car_brand`
i `car_model`, brak → workflow `quote_vehicle`. Agent widzi jedną operację.
`resolve-template` i `quote-price` zostają w Neście. `composeQuoteVehicle`
składa je w `quote-vehicle`: kaskada `none` / `many`, jeden szablon bez
wariantu → `need_variant`, potem jedna kwota z macierzy. Przy `knowledge`
wycena nie woła `quote-vehicle`.

## Workflow `quote_vehicle`

Mastra (`id` `quote-vehicle`) suspend/resume. Krok woła tę samą funkcję
domeny `advanceQuoteVehicle`.

Brak marki albo modelu → `waiting_for_vehicle` i pytanie. Krótka odpowiedź
uzupełnia brakujące pole i wznawia ten sam proces, bez nowej kwalifikacji.
Pytanie (znak zapytania, „jak/czy/ile…”) zamyka workflow i idzie zwykłą
kwalifikacją. Po komplecie slotów tura dostaje `quote-vehicle`.
Id toola i id workflow Mastry to ten sam napis `quote-vehicle`; to dwa
rejestry. Slug domeny slotów zostaje `quote_vehicle`.

Stan workflow jest w pamięci procesu, obok intencji sesji. Nie w Supabase.

## Retrieval gałąź → liść

Na istniejącej rurze liścia (cosine + BM25 + RRF + rerank + margin):

1. gałęzie (węzły z dziećmi): wektor + BM25 + RRF,
2. miękki bonus `relatedBranches` i gałęzi z top 3,
3. liście jak dziś, z bonusem gdy rodzic jest w top 3,
4. lookup `body` tylko po slugu.

Puste `relatedBranches` → sama rura liścia, bez zmiany kolejności.

## Ślad decyzji

Event `decision_trace`: `intent`, `sub_intent`, `mode`, `execution`,
opcjonalnie `tool` lub `workflow`. Bez treści wiadomości klienta.

## Poza tym kontraktem

Zamówienia, tracking, konto, checkout, płatności, tool reklamacji do
Bitrixa, `micro_intent`, twardy filtr gałęzi, retrieval wielu workflowów,
vendor rerank, `body` w `search-leaves`, embeddingi Mastry, panele
Intent / Knowledge / Tool / Workflow Manager i Retrieval Lab.
