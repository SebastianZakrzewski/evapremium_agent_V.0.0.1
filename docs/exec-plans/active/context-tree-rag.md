# Plan: RAG context tree (slug, nie fakt)

Cel: gdy model nie trafi w `slug`, Nest znajduje **kandydatów liści** po
podobieństwie pytania do treści `eva_bot.context_nodes`. **Body nadal tylko z
`lookup-leaf`.** RAG nie jest źródłem ceny, szablonu ani polityki.

Źródła: `ARCHITECTURE.md`, `docs/design-docs/context-tree-rag.md` (mechanizm),
`docs/design-docs/core-beliefs.md`, `docs/product-specs/mvp-obsluga-klienta.md`,
`docs/SECURITY.md`. Semantic recall historii: `docs/references/mastra/memory.txt`
(poza tym planem).

To jest praca **po MVP agenta**. Embeddings na FAQ były odrzucone na MVP;
ten plan je odblokowuje wyłącznie w wariancie poniżej. `core-beliefs.md` i
`ARCHITECTURE.md` aktualizować w slice’u, który wdraża pierwsze I/O wektorów
(Slice 3), nie wcześniej.

Zasada: **jeden slice na iterację**; czerwony test → kod → `npm run verify`.
Merge na `main` przed następnym slice. Apply migracji na PROD tylko za zgodą.

## Zaakceptowany wariant

1. Pytanie użytkownika → embedding (**port Nest**, nie Mastra).
2. Wyszukanie w pgvector (Supabase) top-K chunków **aktywnych liści** z
   niepustym `body` — query robi Nest.
3. Wynik toola: lista `{ slug, score }` powyżej progu — **bez `body`**.
4. Agent Mastry woła istniejące `lookup-leaf(slug)`. Miss wyszukiwania (nic
   powyżej progu) = dzisiejszy miss: brak faktu, bez zgadywania, lead tylko
   kontakt + zgoda.

### Podział Mastra / Nest

Mastry **nie odpinamy**. Orkiestruje turę jak dziś (kwalifikacja, DeepSeek,
`createTool`). Nowy tool `search-leaves` jest w mapie agenta; `execute` woła
serwis Nest — tak jak `lookup-leaf`.

Mastra **nie** obsługuje modelu embeddingowego: brak `embedder` na agencie,
brak `Memory.semanticRecall`, brak `vectors` na instancji `Mastra` jako
ścieżki FAQ. Klucz embeddera i `DATABASE_URL` zostają w Nest / env API.
LLM nie pisze SQL i nie widzi connection stringa.

Klient pgvector (np. surowe `pg` albo `@mastra/pg` użyte **w adapterze Nest**)
to detal Slice 3, nie „embedding Mastry”.

## Poza tym planem

Zastąpienie `lookup-leaf` retrieavalem chunków w prompcie. RAG na szablonach
i `pricing_matrix`. Semantic recall transkryptu (`Mastra Memory` + jej
embedder). Embedding w konfiguracji agenta Mastry. Drugi proces Mastry.
Widget bijący w wektory. Apply PROD / nowy sekret na Hetznerze bez zgody.
Nowy model czatu Eva.

## Slice 1 — kontrakt wyszukiwania (domena, in-memory) (zrobione)

Test: znana parafraza (`kiedy wyślecie dywaniki`) przy fixture liścia
`dostawa` zwraca ten slug ze score ≥ próg; nieznany temat / gałąź /
nieaktywny liść / pusty body → pusta lista; wynik **nie zawiera** `body`.
Kod: `searchContextLeaves(query, index, threshold)` w `api/src/domain/`
(albo obok `context-tree.ts`). Fixture z ręcznymi wektorami albo
deterministycznym stubem podobieństwa — bez sieci, bez klienta Postgres.
Wpis w `docs/test-cases/api/domain/`. Bez HTTP, bez Mastry, bez embeddera.

## Slice 2 — porty Nest: embedder + indeks (zrobione)

Test: katalog za portem; stub embeddera w Jest (stały wektor per tekst);
ten sam kontrakt co Slice 1. Brak embeddera w env → wyszukiwanie nie woła
sieci i zwraca pusto albo pomija tool (ustalić w teście: **pusto**, żeby
ścieżka miss została).
Kod: `CONTEXT_LEAF_SEARCH` / `TEXT_EMBEDDER` analogicznie do
`CONTEXT_NODE_CATALOG`. Embedder jest portem **Nest** (w teście stub).
`ContextTreeService` (lub cienki serwis obok) ma `searchLeaves(query: string)`.
Bez migracji, bez `createTool`, bez embeddera na instancji Mastry.

## Slice 3 — pgvector w `eva_bot` + ingest z liści (zrobione)

Test: adapter mapuje wiersze indeksu na kontrakt Slice 1; ingest aktywnego
liścia z body zapisuje wektor; ponowny ingest tego samego sluga nadpisuje;
liście `chat-zapis` / `zgoda-lead` z pustym body **pominięte**.
Kod: migracja w repo (`create extension vector`, tabela w `eva_bot`, np.
`context_node_embeddings`: slug, chunk, embedding, zaktualizowano). Loader
i query przez **Nest → Postgres** (`DATABASE_URL` / pooler), nie supabase-js
REST i nie runtime Mastry. Klient SQL/pgvector żyje w adapterze Nest; nie
rejestrujemy magazynu na `new Mastra({ vectors })`. Brak DDL w requeście
czatu (schemat = migracja). **Bez apply na PROD.** Sekret connection stringa
i klucz embeddera tylko na API (Hetzner / `.env`), wpis w `SECURITY.md`.
Korekta `core-beliefs`: RAG na FAQ wyłącznie jako wyszukiwanie sluga w Nest.

## Slice 4 — tool sklepu i event (zrobione)

Test: `ShopTools.searchLeaves` emituje event (np. `context_search`) z
`slugs` + czy cokolwiek przekroczyło próg; **bez** treści FAQ w paylodzie;
następnie `lookup-leaf` jak dziś (`context_hit` / `context_miss`).
Kod: nowy id toola ⊆ shop-tools (`search-leaves`). `SHOP_TOOL_IDS` +
profile: `delivery`, `after_sales`, `product_info` dostają ten tool **obok**
`lookup-leaf`, nie zamiast. `pricing` i `out_of_scope` bez wyszukiwania FAQ.
Dashboard: nowy typ eventu w KPI „Prawda” tylko jeśli spec dashboardu to
wymaga — w tym slice minimum to zapis eventu; zmiana karty KPI osobno, gdy
operator tego chce.

## Slice 5 — Mastra: tool + instrukcja tury (zrobione)

Test: na intencji `delivery` mapa tooli ma `search-leaves` i `lookup-leaf`;
execute `search-leaves` zwraca JSON slugów; stub bez klucza DeepSeek nie
woła embeddera sieciowego (kontrakt Slice 2). Prompt profilu: najpierw
`search-leaves` gdy slug niepewny, potem `lookup-leaf`; nie cytować nic
spoza hit `lookup-leaf`; puste wyszukiwanie = miss.
Kod: `createTool` w `create-eva-mastra-agent.ts` → `ShopTools.searchLeaves`
(Nest). `prepare-intent-turn` / `profiles.ts`. Bez zmiany ramek SSE. Agent
Mastry bez pola `memory.embedder` / `vectors`. DeepSeek tylko czat.

## Slice 6 — uruchomienie indeksu i granice

Test: przy env embeddera + `DATABASE_URL` ingest z listy liści (fixture
store) buduje indeks; bez env `verify` nadal zielone (fixture Slice 1–2).
Kod: ingest przy starcie API **albo** skrypt `api` (wybrać jedno w teście:
skrypt jest czytelniejszy niż długi boot). Dokumentacja: `ARCHITECTURE.md`
(źródła danych: wektory pomocnicze; fakt = liść), `docs/DEPLOY.md` (nowe
env), `docs/provider_configuration.example.json`. Smoke na PROD **tylko za
zgodą** (apply migracji + sekret embeddera + DB URL na Hetznerze).

Model embeddera (osobny od DeepSeek; woła go Nest, nie Mastra) ustalić przed
Slice 3 i wpisać wymiar do migracji — zmiana modelu = przebudowa indeksu.

## Definicja końca

Parafraza FAQ → slug → `lookup-leaf` → to samo `body` co przy znanym slugu.
Brak sąsiada powyżej progu → `{ status: 'miss' }` bez zmyślonej polityki.
Cena i kaskada bez zmian. `verify` zielone; test-cases zaktualizowane.
Migracja na PROD nie jest częścią „done” bez osobnej zgody.

## Otwarte (nie blokują Slice 1–2)

- Dostawca i wymiar embeddingu: **OpenAI `text-embedding-3-small`, 1536**
  (Nest, `OPENAI_API_KEY`; bez klucza — stub).
- Wartość progu cosine i `topK` — kalibracja na prawdziwych liściach po
  Slice 3.
- Pooler transaction vs session mode do pgvector (Supabase).
- Czy karta dashboardu „Prawda” rozróżnia `context_search` od `context_miss`.
