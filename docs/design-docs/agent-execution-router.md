# Router wykonania agenta

Źródło prawdy granic: `ARCHITECTURE.md`. Przepływ intencji (profil, krawędzie):
`docs/design-docs/intent-workflow.md`. Retrieval liścia:
`docs/design-docs/context-leaf-hybrid-retrieval.md`.
Plan: `docs/exec-plans/completed/agent-execution-router.md`.

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
`indicative_quote`, `complaint_info`, `contact_request`.

## Execution router

Czysta funkcja `chooseExecution` po kwalifikacji:

| Warunek | Ścieżka |
| --- | --- |
| brak sub-intencji | toole profilu intencji (dotychczasowa pętla) |
| `mode = knowledge` | `lookup-leaf` / `search-leaves` z allowlisty sub-intencji |
| `fitment` i jest marka, model, rok albo nadwozie | `fitment_cascade`, także gdy kwalifikator dał `knowledge` |
| `mode = action` i komplet `requiredInputs` | `directTool` (allowlista sub-intencji) |
| `mode = action` i brak pól, jest `fallbackWorkflow` | workflow, zero shop-tooli w tej turze |
| `ambiguous` albo mode spoza `allowedModes` | dopytanie, zero shop-tooli |

„Czy pola są kompletne?” nie idzie do modelu. Cena i fakt nadal z Nest.

`fitment` z którąkolwiek daną auta (marka, model, rok, nadwozie) uruchamia
`fitment_cascade` także przy `mode = knowledge`. Pytanie „czy macie / czy pasują
dywaniki do tego auta” nie zostaje na `resolve-template`. Bez auta zostaje FAQ
(`lookup-leaf`, `search-leaves`). `indicative_quote` w `action` wymaga marki,
modelu, roku i typu nadwozia. Brak któregokolwiek pola uruchamia `quote_vehicle`.
`fitment_cascade` filtruje, gdy są marka i model. Dalsze pytanie dotyczy tylko
pola, które jeszcze rozdziela szablony, albo pola, które wyzerowało wynik.
Krótka odpowiedź uzupełnia dopytywany slot bez nowej kwalifikacji i może
dopisać rok oraz nadwozie z tego samego zdania. Wycena rusza przy komplecie
czterech pól.

`indicative_quote`: po komplecie `directTool = quote-vehicle`. Agent widzi jedną operację.
`resolve-template` i `quote-price` zostają w Neście. `composeQuoteVehicle`
składa je w `quote-vehicle`: kaskada `none` / `many`, jeden szablon bez
wariantu → `need_variant`, potem jedna kwota z macierzy. Przy `knowledge`
wycena nie woła `quote-vehicle`.

## Workflow `quote_vehicle`

Mastra (`id` `quote-vehicle`) suspend/resume. Krok woła tę samą funkcję
domeny `advanceQuoteVehicle`.

Brak marki, modelu, roku albo typu nadwozia → `waiting_for_vehicle` i pytanie.
Krótka odpowiedź uzupełnia brakujące pole i wznawia ten sam proces, bez nowej
kwalifikacji.
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
