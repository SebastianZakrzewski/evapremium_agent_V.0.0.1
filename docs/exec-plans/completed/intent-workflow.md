# Plan: workflow intencji (TDD)

Cel: kwalifikacja na każdą wiadomość użytkownika, potem gałąź Mastry z
`IntentProfile` (instrukcja + tool-e tury).

Źródła: `ARCHITECTURE.md`, `docs/design-docs/intent-workflow.md`,
`docs/product-specs/mvp-obsluga-klienta.md`.

Slice’e 1–4 zamknięte (audyt pass). Dług TD-010: `allowedTransitions` bez
stanu sesji w `ChatAgent`.

Zasada (historyczna): jeden slice na iterację; czerwony test → kod →
`npm run verify`. HTTP czatu, CORS, Bitrix, kaskada i macierz bez przebudowy.

## Poza tym planem

Checkout, RAG, VIN, live-handoff, nowy tool zamiast `resolve-template`,
apply migracji PROD, drugi proces Mastry.

## Slice 1 — interfejs i rejestr profili (zrobione)

Test: `intentProfileFor('product_info')` ma id, niepusty `context`,
`tools` ⊆ `{ resolve-template, quote-price, lookup-leaf }`; nieznany /
niepodpięty intent → `undefined`.
Kod: `IntentProfile`, `ShopIntent`, klasy (w tym stuby **wypełnione**
minimalnym kontraktem, nie `!`). `product_info` z toolami
`resolve-template` + `lookup-leaf`.

## Slice 2 — kwalifikator (LLM za portem) (zrobione)

Test: wiadomość → `ShopIntent` ze schematu; stub bez klucza DeepSeek.
Kod: krok workflow / agent bez shop-tooli; structured output.
Bez streamu odpowiedzi sklepu w tym slice.

## Slice 3 — gałąź składa agenta tury (zrobione)

Test: dla `pricing` agent tury widzi tylko `quote-price` (+
`resolve-template` zgodnie z profilem); wywołanie `quote-price` na
`product_info` niemożliwe (brak w mapie tooli).
Kod: `MastraChatAgent` uruchamia workflow zamiast jednego agenta z trzema
toolami. Stream SSE bez zmiany kontraktu ramek.

## Slice 4 — fallback i lead (zrobione)

Test: niska pewność / brak profilu → `out_of_scope`, zero shop-tooli;
lead nadal tylko kontakt + zgoda (domena Nest, bez toola Mastry).
Kod: `IntentFallback`; brak `general_agent`.

## Definicja końca

Każda tura user → qualify → profil → agent z podzbiorem tooli Nest.
Cena tylko z `quote-price` na `pricing`. Fakt tylko z `lookup-leaf`.
`verify` zielone; wpisy w `docs/test-cases/`.
