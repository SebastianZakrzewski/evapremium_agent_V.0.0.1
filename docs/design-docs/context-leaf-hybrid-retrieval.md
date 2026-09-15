# Hybrid retrieval liści FAQ (dataset → RRF → rerank → lookup)

Źródło prawdy granic: `ARCHITECTURE.md`. Ten dokument: **projekt** rury
wyszukiwania sluga po kalibracji cosine (hit@1 ≈ 0.57, recall@K = 1.0).
Plan slice’ów: `docs/exec-plans/active/context-leaf-hybrid-retrieval.md`.
Warstwa cosine + `lookup-leaf`: `docs/design-docs/context-tree-rag.md`
(niezmienniki zostają).

Status: **wdrożone w kodzie** (`main`). Pełny efekt na PROD po apply migracji
`retrieval_text`, wklejeniu tekstów liści i ponownym ingescie wektorów.

Baza cosine (hit@1 4/7) i cele po rurze:
`docs/eval/leaf-retrieval-metrics.md`.

## Problem

Indeks wektorowy na `title + body` ustawia właściwy slug prawie zawsze w
czwórce, ale **pierwszy** wynik często jest zły (kolizje
`dostawa` / `czas-produkcji`, `gwarancja` / `niedopasowanie-wymiana`).
Instrukcja tury każe wołać `lookup-leaf` od najwyższego cosine — to utrwala
zły fakt. DeepSeek potem wiernie opowiada niewłaściwe `body`.

Cel rury: **lepsza kolejność slugów** przed lookupem. Fakt nadal wyłącznie
z `lookup-leaf`. Cena i kaskada bez zmian.

## Niezmienniki (jak RAG slug)

| Pytanie | Odpowiedź |
| --- | --- |
| Skąd treść FAQ w czacie? | `lookup-leaf` → `context_nodes.body` |
| Czy `search-leaves` zwraca `body`? | Nie |
| Czy reranker / BM25 widzą `body` w toolu Mastry? | Nie. Czytają `retrieval_text` **w Neście** |
| RAG na cenniku / szablonach? | Nie |
| Embedder Mastry / Memory? | Nie |

## Rura (kolejność)

```text
dataset testowy (złoto)
    │  kalibracja + few-shot
    ▼
retrieval_text  ──► ingest embeddingu (zamiast surowego body)
    │
    ▼
few-shot w instrukcji profilu   (nie w wyniku toola)
    │
pytanie tury
    ├─► embedding (istniejący TEXT_EMBEDDER) → ranking A
    └─► BM25 na retrieval_text (Nest, in-memory) → ranking B
    │
    ▼
RRF(A, B) → pula top 5–10
    │
    ▼
reranker (port Nest, para query × retrieval_text) → nowa kolejność
    │
    ▼
margin / confidence  → lista do agenta { slug, score, confidence }
    │
    ▼
lookup-leaf(slug) → body
    │
    ▼
odpowiedź agenta (agent_loop; verbatim poza tym planem)
```

Wszystkie stopnie poza few-shot i odpowiedzią żyją w **Nest**, za
`ShopTools.searchLeaves`. Mastra nadal woła jeden tool `search-leaves`.

## Stopnie — co i po co

### 1. Dataset testowy

Kanoniczny zestaw `{ id, query, expectSlugs[], intent }` w repozytorium
(TypeScript, nie skrypt `tmp-*`). Źródło: kalibracja PROD PL (Q1–Q8) plus
kolejne parafrazy, gdy biznes doda liść.

Użycie:

- test domeny rury (hit@1, recall@K, wrong_top) w `verify` na **fixture**
  wektorów / tokenów — bez sieci;
- skrypt kalibracji na żywym indeksie (osobno, za zgodą, jak dziś
  `tmp-calibrate-threshold`) — nie część `verify`;
- generator few-shot (ten sam plik, żeby przykłady nie rozjechały się z
  złotem).

Dataset **nie** jest cennikiem i nie idzie do widgetu.

### 2. `retrieval_text`

Osobny tekst **do wyszukiwania**, nie kopia `body` pokazywanego klientowi.

- `body` — polityka sklepu (lookup, czat).
- `retrieval_text` — krótkie zdania i parafrazy, które klient naprawdę
  wpisuje („kiedy wyślecie”, „ile trwa szycie”), bez wspólnego bełkotu
  marketingowego, który zbliża wektory (`dostawa` vs `czas-produkcji`).

Domyślnie, gdy pole puste: zachowanie jak dziś (`title + body`) — ingest i
BM25 nie padają na starych wierszach.

Przechowywanie: kolumna na `eva_bot.context_nodes` (albo równoważne pole
w loaderze). Embeddowany `chunk` w `context_node_embeddings` = znormalizowany
`retrieval_text` (fallback `title + body`). Po zmianie tekstu: **ponowny
ingest**. Apply migracji PROD tylko za zgodą.

### 3. Few-shot w instrukcji

Nie retrieval. Po qualify profil (`delivery`, `after_sales`, …) dostaje
**2–4** linijki z datasetu dla tej intencji, np. „kiedy wyślecie → slug
`dostawa`, nie `czas-produkcji`”.

Cel: gdy RRF zostawi 2–3 slugi, model nie ma brać ślepo #1, jeśli few-shot
rozstrzyga kolizję znaną z kalibracji. Źródło linijek = funkcja z datasetu,
nie ręcznie rozjechany string w `profiles.ts`.

Limit tokenów: krótko; nie wklejać `body`.

### 4. Embedding + BM25

**Embedding** — istniejący cosine na indeksie `text-embedding-3-small`.
Query = wiadomość klienta (Nest może nadpisać `query` toola na tę wiadomość
w późniejszym slice’u protokołu; ten plan tego nie wymaga).

**BM25** — ranking leksykalny w procesie API po tokenach `retrieval_text`
(katalog liści jest mały, ~dziesiątki wierszy; ten sam wzorzec co cosine w
RAM). Bez Elasticsearch. Tokenizacja: małe litery, rozbicie po
nie-literach, opcjonalne zdjęcie znaków diakrytycznych PL (żeby „wyslecie”
trafiało „wyślecie”).

Po co: cosine nie czyta dosłownie „wyślecie”; BM25 czyta. Fuzja łapie to, czego
sam wektor nie rozdzieli.

Oba rankigi zwracają uporządkowaną listę slugów (bez `body`). Próg cosine
**zostaje sitkiem śmieci** (dziś 0.49), nie jedynym sortowaniem. BM25: top-N
bez twardego cosine (inaczej puste zapytania leksykalne giną).

### 5. RRF (Reciprocal Rank Fusion)

Dla każdego sluga z unii rankingów A i B:

```text
RRF(slug) = 1/(k + rank_embed) + 1/(k + rank_bm25)
```

`k` stała (typ. 60; wartość w teście domeny, nie „na oko” na PROD). Brak
w rankingu = pominięcie składnika (nie kara zero). Sort malejąco po RRF,
obcięcie do **puli 5–10** (więcej niż dzisiejsze 4, bo reranker ma z czego
wybierać; recall@K już jest 1.0 przy K=4 — pula 10 to zapas po fuzji).

RRF nie wymaga wspólnej skali cosine vs BM25.

### 6. Reranker

Wejście: te 5–10 par `(query, retrieval_text)`. Wyjście: nowa kolejność
slugów. Port Nest (`LEAF_RERANKER`), **nie** Mastra.

**Wariant A (ten plan, `verify` bez sieci):** rerank w kodzie — druga BM25
/ nakładanie tokenów na **samej puli** + boost dokładnego title/slug +
opcjonalny prior intencji (po `ShopIntent` z tury, jeśli resolver go
dostanie). To jest rerank IR, nie nowy vendor.

**Wariant B (później, zgoda na sekret):** HTTP cross-encoder (np. Jina /
Cohere rerank). Ten sam port; w `verify` stub zachowuje kolejność RRF.
Nie blokuje slice’ów A. Nie wkleja `body` do modelu czatu.

### 7. Margin / confidence

Po reranku:

- `margin = score_1 - score_2` (score = pozycja reranka albo znormalizowany
  RRF — jeden wzór w teście).
- Duża luka → `confidence: 'high'` (agent może brać #1).
- Mała luka (jak 0.03 cosine na dostawie) → `confidence: 'ambiguous'`.

Kontrakt `search-leaves` rozszerza się o `confidence` na liście (nadal bez
`body`). Instrukcja profilu: przy `ambiguous` drugi lookup albo wybór body,
które odpowiada na pytanie — **nie** „zwykle najwyższy score”. Przy `high`
jeden lookup i stop.

Pusta pula po sitkach = `[]` = miss jak dziś.

### 8. Lookup i odpowiedź

Bez zmiany semantyki `lookup-leaf`. Agent (albo później protokół tury)
woła slug z listy. Odpowiedź w SSE nadal z pętli Mastry; ten plan **nie**
wprowadza verbatim FAQ.

Filtrowanie listy po intencji (odrzucić `gwarancja` na profilu `delivery`)
jest dozwolone **po** qualify, w Nest, jako wejście reranka albo po RRF —
RAG nadal nie klasyfikuje intencji.

## Podział warstw

| Warstwa | Robi |
| --- | --- |
| Dataset + BM25 + RRF + margin | domena `api/src/domain/` (czyste funkcje) |
| `retrieval_text`, ingest chunk | ingest + loader `context_nodes` |
| Reranker | port + implementacja in-process; opcjonalnie HTTP |
| `searchLeaves` | `ContextTreeResolver` składa rurę |
| Few-shot | `assembleTurnInstructions` / prompt-blocki z datasetu |
| Tool Mastry | ten sam id; szerszy JSON wyniku |

## Poza planem

Verbatim `body` w SSE. Chunki FAQ w prompcie. `body` w wyniku
`search-leaves`. RAG szablonów/cennika. Elasticsearch. Nowy model czatu.
Podnoszenie progu cosine „żeby hit@1 magicznie wzrósł”. Apply PROD bez zgody.
