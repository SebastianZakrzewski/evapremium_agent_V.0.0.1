# Plan: router wykonania agenta (TDD)

Cel: jedno wywołanie rozumie `intent`, `sub_intent`, `mode`, `entities`
i `confidence`. Backend wybiera wiedzę, tool albo workflow `quote_vehicle`.
Retrieval gałąź → liść dokłada miękki bonus do istniejącej rury liścia.

Kontrakt: `docs/design-docs/agent-execution-router.md`.
Granice: `ARCHITECTURE.md`. Intencje: `docs/design-docs/intent-workflow.md`.
Liście: `docs/design-docs/context-leaf-hybrid-retrieval.md`.

Zasada: czerwony test → kod. Apply migracji PROD tylko za zgodą.
Jeden zestaw slice’ów poniżej; rodzice tylko `product_info`, `pricing`,
`delivery`, `after_sales`.

## Poza tym planem

Zamówienia, konto, checkout, płatności, tool reklamacji, `micro_intent`,
twardy filtr gałęzi, retrieval workflowów, vendor rerank, `body` w
`search-leaves`, panele CMS (Intent / Knowledge / Tool / Workflow Manager,
Retrieval Lab).

## Slice 1 — typy i katalog (zrobione)

Test: sześć slugów, rodzic z `ShopIntent`, `indicative_quote` wymaga
`car_brand` i `car_model` oraz `fallbackWorkflow = quote_vehicle`.
Kod: `api/src/domain/sub-intent-catalog.ts`. Bez HTTP i bez LLM.

## Slice 2 — kwalifikator (zrobione)

Test: stub i schemat zwracają pełny obiekt w jednym wywołaniu; pusta mapa
shop-tooli; niska pewność nadal kończy na `out_of_scope`.
Kod: `qualifyResultSchema`, `StubIntentQualifier`, instrukcja kwalifikatora.

## Slice 3 — `chooseExecution` (zrobione)

Test: knowledge nie woła `quote-price`; action z marką i modelem →
`resolve-template`; brak pól → `quote_vehicle`; `ambiguous` → clarify.
Kod: `api/src/domain/choose-execution.ts`.

## Slice 4 — tura (zrobione)

Test: `prepareIntentTurn` zawęża toole do sub-intencji; komplet slotów
wskazuje `directTool`; brak slotów nie wystawia `quote-price`.
Kod: `prepare-intent-turn.ts`. `allowedTransitions` bez zmiany roli.

## Slice 5 — workflow wyceny (zrobione)

Test: brak encji → suspend `waiting_for_vehicle`; krótka odpowiedź
wznawia i nie woła kwalifikatora; pytanie w trakcie zamyka workflow;
komplet → `resolve-template`.
Kod: `advanceQuoteVehicle`, krok Mastry `quote-vehicle`, stan sesji.

## Slice 6–7 — gałąź → liść (zrobione)

Test: RRF gałęzi, bonus nie wygrywa z dużą luką score, hit@1 gałęzi i liścia
na fixture „kolory”. Puste `relatedBranches` zostawiają `hybridSearchLeaves`.
Kod: `api/src/domain/branch-retrieval.ts`; `searchLeaves` czyta bonus z tury.

## Slice 8 — ślad decyzji (zrobione)

Test: event `decision_trace` bez tekstu klienta, obok `intent_accepted`.
Kod: payload w domenie, zapis w `MastraChatAgent`.
