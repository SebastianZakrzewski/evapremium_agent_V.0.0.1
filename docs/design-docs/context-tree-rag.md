# RAG context tree (slug, nie fakt)

Źródło prawdy granic: `ARCHITECTURE.md`. Ten dokument: jak ma działać
wyszukiwanie liści po podobieństwie. Implementacja (slice’e):
`docs/exec-plans/active/context-tree-rag.md`.

To jest projekt **po MVP**. W kodzie nadal jest tylko lookup po slugu.
Dopóki Slice 3 nie wejdzie, `ARCHITECTURE.md` i `core-beliefs.md` mówią
„bez RAG / embeddings odrzucone na MVP”.

## Problem

Klient pyta językiem naturalnym („kiedy wyślecie”, „czy można prać”). Model
musi podać **slug** liścia (`dostawa`, …), żeby Nest zwrócił `body`. Przy
nietrafionym slugu dziś jest `miss`: brak faktu, zakaz zmyślania. RAG ma
zmniejszyć liczbę missów z **złego sluga**, nie zastąpić drzewa.

## Niezmiennik

| Pytanie | Odpowiedź |
| --- | --- |
| Skąd jest treść FAQ? | Wyłącznie `lookup-leaf` → aktywny liść `eva_bot.context_nodes` |
| Co robi RAG? | Z pytania robi wektor i zwraca kandydatów `{ slug, score }` |
| Czy tool wyszukiwania zwraca `body`? | Nie |
| Czy cena / szablon idą przez wektory? | Nie |
| Czy Mastra Memory embedduje transkrypt? | Nie (poza tym projektem) |
| Czy LLM pisze SQL albo widzi `DATABASE_URL`? | Nie |

Brak sąsiada powyżej progu = ten sam miss co dziś. Obietnica kontaktu z
człowiekiem nadal wymaga leada Nest (kontakt + zgoda).

## Elementy

```text
Klient
  → widget / SSE (bez zmian kontraktu)
    → Nest ChatController
      → kwalifikacja intencji (bez shop-tooli)
      → agent tury Mastra (DeepSeek) + podzbiór tooli
           search-leaves ──► Nest ──► embedder ──► magazyn wektorów (pgvector)
           lookup-leaf   ──► Nest ──► context_nodes (REST / katalog w RAM)
           resolve-template / quote-price  (bez RAG)
```

**Katalog liści** — jak dziś: drzewo w pamięci procesu, załadowane z
`context_nodes` albo fixture. Lookup po slugu, liść = węzeł bez dzieci,
`is_active`, unikalny `slug`.

**Embedder** — port Nest (`TEXT_EMBEDDER`). Ten sam model przy ingestcie i
przy pytaniu. Inny niż DeepSeek czatu. W `verify` / bez klucza: stub
(deterministyczny wektor albo puste wyszukiwanie). Dostawca i wymiar:
otwarte do Slice 3.

**Magazyn wektorów** — tabela w Postgresie Supabase (schemat `eva_bot`,
`context_node_embeddings`) z kolumną `vector` (pgvector). Wiersz = chunk
tekstu liścia + embedding + `slug`. To indeks podobieństwa, nie kopia
polityki sklepu. Tura czatu **czyta** indeks tym samym `DataStore` co
`context_nodes` (service role / PostgREST). `DATABASE_URL` zostaje przy
ingescie (skrypt), nie jest wymagany do `search-leaves`. Execute toola
Mastry nadal woła tylko serwis Nest.

**Próg i top-K** — liczby kalibracji (otwarte). Poniżej progu kandydat
wypada, nawet jeśli jest „najbliższy”.

## Faza A — ingest (nie tura czatu)

Uruchomienie: skrypt API albo boot (decyzja w Slice 6). Nie w pętli agenta.

Dla każdego węzła z katalogu:

1. Pomiń, jeśli nie jest liściem, `is_active = false`, albo `body` jest puste
   (w tym seed `chat-zapis` / `zgoda-lead`, dopóki biznes nie wklei treści).
2. Znormalizuj tekst do embeddingu (np. `title` + `body`; dokładny kształt w
   teście ingestu).
3. Policz embedding tym samym modelem co query.
4. Upsert po `slug` (ponowny ingest nadpisuje). Gałęzi nie indeksujemy — nawet
   gdyby model kiedyś dostał slug gałęzi, `lookup-leaf` i tak zwróci miss.

Zmiana `body` w bazie **nie** aktualizuje wektorów sama z siebie. Po edycji
FAQ: ponowny ingest. Zmiana modelu embeddingu = przebudowa całego indeksu
(wymiar kolumny musi się zgadzać).

Bez env embeddera: `search-leaves` zwraca `[]`. Bez `DATABASE_URL` ingest
się nie wykonuje; tura czatu i tak czyta już zapisany indeks przez
Supabase. Bez indeksu / bez klucza OpenAI czat działa jak MVP (tylko slug).

## Faza B — tura czatu

Każda wiadomość użytkownika jak dziś: qualify → `IntentProfile` → pętla
tooli. RAG nie klasyfikuje intencji.

### Kiedy którego toola

| Intencja | `search-leaves` | `lookup-leaf` | Inne |
| --- | --- | --- | --- |
| `delivery` | tak | tak | — |
| `after_sales` | tak | tak | — |
| `product_info` | tak (FAQ oferty) | tak | `resolve-template` |
| `pricing` | nie | nie | kaskada + `quote-price` |
| `out_of_scope` | nie | nie | zero shop-tooli |

Instrukcja profilu (docelowa):

- znasz slug → od razu `lookup-leaf`;
- nie znasz albo poprzedni lookup był miss → `search-leaves` z **pytaniem
  użytkownika** (nie z wymyślonym slugiem);
- dostałeś listę slugów → `lookup-leaf` na kandydacie (zwykle pierwszy /
  najwyższy score);
- pusta lista albo miss lookupu → brak faktu; nie zgaduj polityki; nie
  obiecuj kontaktu bez leada Nest;
- nie wklejaj do odpowiedzi niczego, czego nie ma w hicie `lookup-leaf`.

`maxToolCalls` profilu musi wystarczyć na search + lookup (dziś 8).

### `search-leaves`

Wejście: tekst zapytania (string).

Nest:

1. Brak embeddera w env → `[]` (ścieżka miss, bez sieci).
2. Embedding zapytania.
3. Query magazynu: najbliższe wektory, `topK` (domyślnie 4 —
   `CONTEXT_LEAF_SEARCH_TOP_K`).
4. Odrzuć score poniżej progu (domyślnie 0.49 —
   `CONTEXT_LEAF_SEARCH_THRESHOLD`; kalibracja PL PROD 2026-09-15).
5. Zostaw tylko slugi, które **teraz** przechodzą `lookupContextLeaf` jako
   potencjalny hit (aktywny liść). Jeśli indeks jest nieświeży (liść
   wyłączony), kandydat znika tutaj, nie w prompcie.
6. Event `context_search`: lista slugów, flaga czy cokolwiek przeszło próg;
   **bez** `body`.
7. Zwrot do Mastry: `{ matches: [{ slug, score }, ...] }` albo pusta tablica.
   Bez fragmentów tekstu liścia.

### `lookup-leaf` (bez zmian semantyki)

Wejście: `slug`.

- aktywny liść → `{ status: 'hit', slug, title, body }`, event `context_hit`;
- brak / gałąź / nieaktywny → `{ status: 'miss' }`, event `context_miss`.

To jedyny moment, w którym model **widzi** treść FAQ.

### Odpowiedź w UI

Kontrakt HTTP/SSE bez nowej ramki. Widget:

- `data.status === 'hit'` — treść z `body` (albo tekst modelu oparty na hicie);
- `data.status === 'miss'` — komunikat miss (ścieżka stub / gdy status jest
  miss);
- produkcja Mastry: tekst wygenerowany po toolach; model ma prawo powiedzieć
  „nie mam w wiedzy sklepu”, nie ma prawa wymyślić terminu.

Lead Bitrix **nie** startuje z samego pustego `search-leaves`.

## Ścieżki (przykłady)

**Trafiony slug bez RAG.** „Ile trwa dostawa?” → `lookup-leaf('dostawa')` →
hit. Magazyn wektorów nieuczestniczy.

**Parafraza.** „Kiedy wyślecie dywaniki?” → `search-leaves` →
`[{ slug: 'dostawa', score: 0.84 }]` → `lookup-leaf('dostawa')` → to samo
`body` co przy znanym slugu.

**Pusty indeks / niski score.** Pytanie spoza liści → `[]` → model nie woła
lookup z wymyślonym slugiem (albo woła i dostaje miss) → brak polityki.

**Nieświeży indeks.** Wektor nadal wskazuje `archiwum-gwarancja`, ale liść
`is_active = false` → odfiltrowany w kroku 5 albo miss na lookupu.

**Kilka kandydatów.** Zwracamy top-K powyżej progu. Model ma wziąć hit
lookupu, nie „uśredniać” dwóch polityk. Konflikt treści = błąd danych w
drzewie, nie w RAG.

## Dane w Supabase

```text
eva_bot.context_nodes          ← prawda (slug, title, body, drzewo)
eva_bot.context_node_embeddings  ← pomoc (slug, chunk, embedding)  [nazwa robocza]
```

Schemat indeksu ustala migracja w Slice 3. DDL nie w requeście czatu
(`disableInit`). Apply na PROD tylko za zgodą.

## Bezpieczeństwo

- Embedder key i `DATABASE_URL` tylko na API (Hetzner / `api/.env`), jak
  service role. Nie widget, nie snippet, nie `DASHBOARD_TOKEN`.
- Eventy i logi: slug + score, nie treść FAQ i nie treść wiadomości klienta
  w payloadzie eventu (spójnie z `SECURITY.md`).
- RLS: odczyt/zapis wektorów wyłącznie Nest (service / connection string).

## Świadomie odrzucone

- Wkładanie chunków do promptu jako „fakt”.
- RAG na `mat_templates` / `pricing_matrix`.
- Semantic recall historii czatu (`@mastra/memory` + embedder Mastry).
- Osobny proces Mastry albo widget → pgvector.
- Drugie drzewo EN / embeddings jako tłumaczenie.

## Otwarte parametry

Nie są częścią niezmiennika; blokują dopiero Slice 3+:

- dostawca i wymiar embeddingu;
- próg cosine i `topK`;
- tryb poolera Supabase do pgvector;
- czy karta dashboardu „Prawda” liczy `context_search` osobno od miss.
