# Plan: hybrid retrieval liści (TDD)

Cel: podnieść **hit@1** sluga FAQ bez oddawania `body` do `search-leaves`.
Rura: dataset → `retrieval_text` → few-shot → embedding+BM25 → RRF →
top 5–10 → rerank → margin → lookup → odpowiedź.

Mechanizm: `docs/design-docs/context-leaf-hybrid-retrieval.md`.
Niezmienniki RAG: `docs/design-docs/context-tree-rag.md`.
Stan cosine PROD: TD-012 w `docs/exec-plans/tech-debt-tracker.md`.

**Jeden slice na iterację.** Czerwony test → kod → `npm run verify`. Merge
na `main` przed następnym. Apply migracji PROD tylko za zgodą. Bez
verbatim, bez RAG cennika, bez nowego procesu Mastry.

## Metryki (baza przed implementacją rury)

Źródło: `docs/eval/leaf-retrieval-metrics.md`.
Zrzut wcześniejszego testu cosine:
`docs/eval/leaf-retrieval-cosine-baseline-2026-09-15.json`.

Na siódemce Q1–Q6+Q8: hit@1 **4/7**, wrong_top **3/7**, recall **7/7**,
empty **0**. Cel po rurze: hit@1 **≥ 6/7**, Q3/Q5/Q6 na #1, recall i empty
bez regresji. Nie podnosić progu cosine zamiast rankingu.

Eval M1–M7 (`docs/eval/agent-effectiveness-*.json`) to osobny test pętli
agenta — nie KPI hit@1.

Jak wprowadzać: każda warstwa to **czysta funkcja domeny + test na
datasetcie**, potem cienkie podpięcie pod istniejący
`ContextTreeResolver.searchLeaves`. Nie zastępujemy cosine w jednym
commicie — dokładamy stopnie z przodu/tyłu tej samej listy slugów.

## Poza tym planem

Verbatim FAQ. `body` w toolu search. Elasticsearch. Vendor rerank HTTP
(tylko port pod to — implementacja A jest in-process). Nowy model DeepSeek.
Zmiana SSE. Bitrix. Dashboard KPI.

## Slice 1 — dataset złota w repo (bez sieci) (zrobione)

**Po co:** dziś kalibracja siedzi w `tmp-threshold-calibration.json`.
Hit@1 / wrong_top nie są asercją `verify`. Bez kanonicznego zestawu każda
kolejna warstwa „poprawia na czucie”.

**Test:** moduł datasetu ma ≥ przypadków z kalibracji PL (w tym Q3
wyślecie→`dostawa`, Q5 gwarancja→`gwarancja`, Q6 niedopasowanie). Funkcja
`evaluateRanking(hits, expectSlugs)` liczy hit@1, recall@K, wrong_top.
Na **celowo złym** rankingu Q3 (najpierw `czas-produkcji`) hit@1 = 0;
na idealnym = 1.

**Kod:** `api/src/domain/leaf-retrieval-dataset.ts` (albo
`api/src/context-tree/eval/`). Bez HTTP, bez embeddera. Wpis
`docs/test-cases/api/domain/`.

**Nie w tym slice:** zmiana `searchContextLeaves`, migracja, prompt.

## Slice 2 — `retrieval_text` i chunk ingestu (zrobione)

**Po co:** wektor i BM25 mają indeksować tekst **napisany pod zapytania**,
nie długie `body`, które zlewa kolizje.

**Test:** `embeddingChunk(node)` używa `retrieval_text`, gdy niepuste;
inaczej `title + '\n' + body` (regresja). Fixture Q3: dwa liście z
**rozłącznym** `retrieval_text` („wysyłka kurier” vs „dni szycia”) →
funkcja wyboru chunka zwraca różne stringi (asercja tekstu, nie sieci).

**Kod:** pole opcjonalne na typie `ContextNode`. Loader Supabase: kolumna
jeśli jest, inaczej `''`. Migracja w repo
`alter table eva_bot.context_nodes add column if not exists retrieval_text
text not null default ''` — **bez apply PROD**. Fixture in-memory w teście
uzupełnia `retrieval_text` dla kolizji z datasetu.

Ingest (`ingestContextLeafEmbeddings`) zapisuje ten chunk do
`context_node_embeddings.chunk` jak dziś.

**Wprowadzenie:** najpierw kod + fixture; na PROD puste pole = stare
zachowanie, zero ryzyka do czasu wypełnienia tekstów i ingestu.

## Slice 3 — BM25 + RRF na fixture (nadal bez zmiany toola) (zrobione)

**Po co:** fuzja leksyki z cosine **w domenie**, mierzona datasetem, zanim
dotknie Mastry.

**Test (domena):**

1. Tokenizacja PL: „Kiedy wyślecie zamówienie?” zawiera token zbliżony do
   `wyslecie` / `wyslecie` po normalizacji.
2. BM25 na dwóch dokumentach (`dostawa` vs `czas-produkcji` z retrieval_text
   ze Slice 2) dla query Q3 → wyższy rank `dostawa`.
3. RRF: embedding rank Q3 = `[czas-produkcji, dostawa]`, BM25 =
   `[dostawa, czas-produkcji]` → po RRF `dostawa` nie gorszy niż pozycja 1
   albo 2 (asercja: `dostawa` przed trzecim; docelowo #1 na tej parze).
4. Stała `k` RRF w teście (np. 60). Pula `slice(0, 10)`.

**Kod:** `tokenizeRetrieval`, `rankBm25`, `fuseRrf` w
`api/src/domain/`. `searchContextLeaves` **na razie bez zmiany** — fuzja
to nowa funkcja `retrieveLeafSlugs(...)` obok. Test-cases domeny.

**Wprowadzenie:** implementacja na listach w pamięci (jak cosine). Katalog
~dziesiątki liści; nie Postgres FTS w tym slice (mniej ruchomych części,
ten sam loader RAM).

## Slice 4 — rerank in-process + margin (zrobione)

**Po co:** RRF zostawia 5–10; rerank ma rozstrzygnąć pulę. Margin ma
zabić instrukcję „bierz #1 zawsze”.

**Test:**

1. Pula `[czas-produkcji, dostawa, reklamacja]` + query Q3 → po reranku
   `dostawa` na #1 (sygnał: nakładanie tokenów query × retrieval_text).
2. Dwa score prawie równe → `confidence: 'ambiguous'`; duża luka (jak
   czyszczenie vs reszta) → `'high'`.
3. Port: stub rerankera w teście tożsamościowy (kolejność wejścia) vs
   implementacja leksykalna — oba za tym samym interfejsem
   `rerank(query, candidates: {slug, retrievalText}[])`.

**Kod:** `confidenceFromMargin`, `lexicalRerank`. Próg margin w stałej
domeny z testem (nie env „na oko” bez asercji). Nadal bez toola Mastry.

**Wprowadzenie:** zero nowego sekretu. Vendor HTTP = osobna zgoda, ten sam
port, nie ten slice.

## Slice 5 — `searchLeaves` składa rurę; kontrakt toola (zrobione)

**Po co:** produkcyjna tura zaczyna dostawać lepszą listę.

**Test:**

- `ContextTreeResolver.searchLeaves(query)` na fixture wektorów +
  `retrieval_text` + dataset Q3: pierwszy slug = `dostawa` (albo
  `confidence: ambiguous` i `dostawa` w top-2 — wybrać **jedną** asercję
  w teście i nie rozmiękczać).
- Wynik **bez** `body` / `retrieval_text`.
- Event `context_search` jak dziś (`slugs`, `matched`); wolno dodać
  `confidence` pierwszego hitu **bez** treści FAQ.
- Bez embeddera w env → `[]` (regresja Slice 2 RAG).
- `search-leaves` Mastry: schema wyniku `{ slug, score, confidence }[]`
  (albo `confidence` obok listy — jeden kształt w teście katalogu tooli).

**Kod:** `searchContextLeaves` zostaje sitkiem cosine (próg 0.49, top-N
większe, np. 10). Resolver: cosine → BM25 na aktywnych liściach → RRF →
rerank → margin → obcięcie do 4 **dla agenta** (albo 3 przy ambiguous).
`ShopTools` + `createSearchLeavesTool` mapują nowy JSON.

**Wprowadzenie:** jedna funkcja w resolverze; profile jeszcze ze starą
instrukcją „najwyższy score” — świadomy dług do Slice 6, wpis w trackerze
jeśli zostaje na `main` między merge’ami.

Top-K widziane przez agenta: nie 10 (szum w prompcie). 10 to pula
wewnętrzna.

## Slice 6 — few-shot z datasetu + instrukcja margin (zrobione)

**Po co:** model ma tę samą wiedzę co złoto kalibracji i przestaje mieć
nakaz ślepego #1.

**Test:** `assembleTurnInstructions` / profil `delivery` zawiera linijkę
few-shot Q3 (`dostawa`, nie tylko ogólnik). Profil `after_sales` — Q5
gwarancja. Instrukcja FAQ: przy `confidence: high` jeden lookup; przy
`ambiguous` nie brać #1 w ciemno; **usunąć** „od najwyższego score” jako
jedyną regułę.

**Kod:** `fewShotLinesForIntent(intent)` z datasetu (max 4 linie).
`profiles.ts` albo `prepare-intent-turn.ts`. Jeśli Studio prompt-blocki
nadpisują instrukcje — dopisać w testcie prompt-blocków albo w dokumentacji
Editora, że blok musi zawierać `{{` / tę samą procedurę; nie rozjeżdżać
dwóch źródeł bez asercji.

**Wprowadzenie:** najpierw fallback `assembleTurnInstructions` (verify bez
Editora). Bloki PROD — aktualizacja ręczna w Studio albo ten sam tekst w
seedzie, jeśli repo go trzyma.

## Slice 7 — metryka na datasetcie + TD-012 (zrobione)

**Po co:** koniec planu = liczba vs baza, nie wrażenie.

**Test:** `evaluateRanking` na **złożonej** rurze — hit@1 datasetu **wyższy**
niż baza cosine 4/7 (`docs/eval/leaf-retrieval-metrics.md`). Asercja:
hit@1 ≥ 6/7 na siódemce zrzutu; Q3, Q5, Q6 hit@1 = true; recall@K = 1;
empty = 0. Live PROD nadal poza `verify`.

**Kod:** jeden test integracji domeny `retrieveLeafSlugs` end-to-end.
Aktualizacja TD-012 (zamknięcie albo nowy kompromis). `ARCHITECTURE.md`:
`search-leaves` = cosine + BM25 + RRF + rerank + margin; fakt = lookup.
`context-tree-rag.md`: link do hybrid, próg cosine nadal sitko.
Ponowny ingest na PROD po wypełnieniu `retrieval_text` — **checklista
operacyjna, nie kod**, za zgodą.

## Definicja końca

- Dataset w repo; `verify` strzeże BM25/RRF/rerank/margin i Q3/Q5.
- `search-leaves` bez `body`; lookup bez zmiany semantyki.
- Instrukcja tury zgodna z `confidence`.
- Próg 0.49 nie jest dźwignią hit@1.
- `verify` zielone; test-cases; ARCHITECTURE w slice’ie, który zmienia
  kontrakt toola (Slice 5) i opis źródeł (Slice 7).

## Kolejność vs rura użytkownika

| Stopień rury | Slice |
| --- | --- |
| dataset testowy | 1 |
| `retrieval_text` | 2 |
| embedding (istniejący) + BM25 + RRF + top 5–10 | 3, podpięcie 5 |
| reranker + margin | 4, podpięcie 5 |
| few-shot w instrukcji | 6 (po kontrakcie toola, żeby few-shot mówił o `confidence`) |
| lookup + odpowiedź | bez zmian zachowania lookup; odpowiedź = istniejący `agent_loop` |

Few-shot jest **po** datasetcie logicznie, ale **wdrażamy po** Slice 5,
żeby nie uczyć modelu starego kontraktu (ślepy top cosine) w tym samym
tygodniu, w którym tool już zwraca `ambiguous`.
