# Metryki hybrid retrieval — baza i cele

Plan: `docs/exec-plans/active/context-leaf-hybrid-retrieval.md`.  
Złoto pytań: `api/src/domain/leaf-retrieval-dataset.ts`.

Po wdrożeniu hybrid ranking porównanie jest do tego dokumentu i zrzutów JSON.
Test `hybrid-retrieval-baseline.spec.ts` w `verify` strzeże cel ≥ 6/7 hit@1
na fixture `retrieval_text` (PROD: po wklejeniu tekstów i ingescie).

## 1. Test bazowy rankingu (cosine only) — punkt odniesienia

Zapisany zrzut wcześniejszej kalibracji PROD PL:

- plik: [`leaf-retrieval-cosine-baseline-2026-09-15.json`](leaf-retrieval-cosine-baseline-2026-09-15.json)
- data: 2026-09-15 (iter-2)
- metoda: embedding `text-embedding-3-small`, cosine na `title + body`,
  indeks 18 liści, **bez** BM25 / RRF / rerank
- n = **7** zapytań (Q1, Q2, Q3, Q4, Q5, Q6, Q8 — Q7 nie było w sondzie)
- sitko w kodzie: próg **0.49**, `topK = 4` (TD-012)
- nagłówek siatki w zrzucie (próg **0.50**, najlepszy kompromis sondy):

| Metryka | Wartość bazy | Znaczenie |
| --- | --- | --- |
| **hit@1** | **4/7 ≈ 0.571** | pierwszy slug = złoto |
| **wrong_top** | **3/7 ≈ 0.429** | lista niepusta, ale #1 zły |
| **hit@3 / recall@K** | **7/7 = 1.0** | złoto jest w czołówce |
| **empty_rate** | **0** | żadne z 7 nie dostało pustej listy |
| próg 0.80 (odrzut) | empty = 1.0 | nie wracać do tego sitka |

`raw_top5` w JSON jest **przed** sitkiem 0.49 (widać score < 0.49). Hit@1
na surowym `raw_top5` i K=4 daje **ten sam 4/7** — to asercja w
`tests/api/domain/leaf-retrieval-dataset.spec.ts`.

### Wynik per pytanie (baza)

| id | Złoto | Cosine #1 | hit@1 |
| --- | --- | --- | --- |
| Q1 | `material-eva` | `material-eva` 0.70 | tak |
| Q2 | `czyszczenie` | `czyszczenie` 0.79 | tak |
| **Q3** | `dostawa` | **`czas-produkcji` 0.58** | **nie** (złoto #2, 0.55) |
| Q4 | `czas-produkcji` | `czas-produkcji` 0.58 | tak |
| **Q5** | `gwarancja` | **`niedopasowanie-wymiana` 0.70** | **nie** (złoto #2, 0.70) |
| **Q6** | `niedopasowanie-wymiana` | **`dopasowanie-model` 0.65** | **nie** (złoto #3, 0.52) |
| Q8 | `3d-z-rantami` \| `3d-bez-rantow` | `3d-bez-rantow` 0.52 | tak |

## 2. Co ma się poprawić po rurze (cele)

Ta sama **siódemka** i te same złote slugi. Inny zestaw = inny eksperyment,
nie „lek po wdrożeniu”.

| Metryka | Baza | Cel po wdrożeniu | Wolno pogorszyć? |
| --- | --- | --- | --- |
| hit@1 | 0.57 | **≥ 6/7 ≈ 0.86** | nie |
| wrong_top | 0.43 | **≤ 1/7** | nie |
| Q3, Q5, Q6 hit@1 | 3× nie | **3× tak** (warunek konieczny celu 6/7) | nie |
| recall@K (K=4 na tej siódemce) | 1.0 | **1.0** | nie |
| empty_rate na tej siódemce | 0 | **0** | nie |
| próg cosine | 0.49 | sitko śmieci, **nie** dźwignia hit@1 | nie „poprawiać” progiem w górę |

Nie liczy się jako sukces: wyższy próg, który podnosi hit@1 przez puste listy
na Q3/Q5/Q6.

Rozszerzony dataset (chipy, M1/M2, parafrazy Q1b…) to **dodatek**. Raport
po wdrożeniu najpierw powtarza siódemkę z JSON, potem opcjonalnie pełny
`LEAF_RETRIEVAL_DATASET`.

## 3. Eval agenta M1–M7 (osobny test, nie mieszać z hit@1)

Zapisane wcześniej:

- baza pętli tooli: [`agent-effectiveness-before.json`](agent-effectiveness-before.json)
  — weighted **81.25**; m3 i m7 = **37.5%** (wielokrotny `search-leaves`)
- po zmianie procedury tury: [`agent-effectiveness-after.json`](agent-effectiveness-after.json)
  — weighted **96.875**; m3 i m7 = **100%**

Hybrid retrieval **nie jest** po to, żeby powtórzyć skok m3/m7. Te pliki
zostają jako historia pętli agenta.

Po rurze: nowy zrzut live (`EVAL_AGENT_EFFECTIVENESS=1`) **nie może** spaść
poniżej `after` na m3, m4, m5, m7 (100%). m1 (S4: czyszczenie → zły intent)
i m6 (S7 out_of_scope) **nie są KPI tej rury**.

## 4. Poza zakresem tej bazy

Wycena (S6), kaskada, lead, verbatim FAQ, lift konwersji sklepu.
