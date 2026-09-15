# Dataset rankingu liści FAQ (domena)

Kod: `tests/api/domain/leaf-retrieval-dataset.spec.ts`  
Złoto: `api/src/domain/leaf-retrieval-dataset.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: kanoniczne pytania PL → oczekiwane slugi (kalibracja PROD
2026-09-15 + chipy + miss). `evaluateRanking` liczy hit@1, recall@K,
wrong_top bez sieci i bez `body`.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| leaf-ds-001 | high | Q3/Q5/Q6 i hard-negatives z kalibracji |
| leaf-ds-002 | critical | Zły top cosine Q3 → hit@1=0, recall=1 |
| leaf-ds-003 | high | faq_miss: pusta lista = sukces |
| leaf-ds-004 | high | Zrzut cosine 2026-09-15 hit@1=4/7 |

### leaf-ds-001 — Q3/Q5/Q6 i hard-negatives

- **Kod:** `tests/api/domain/leaf-retrieval-dataset.spec.ts` → `it('keeps calibration paraphrases Q3 Q5 Q6 with collision hard negatives')`
- **Krytyczność:** high
- **Logika:** złoto nie gubi kolizji `dostawa`/`czas-produkcji` i gwarancji.
- **Wejście:** dataset w module
- **Wyjście:** Q3→`dostawa`, Q5→`gwarancja`, Q6→`niedopasowanie-wymiana`

### leaf-ds-002 — Zły top cosine Q3

- **Kod:** `tests/api/domain/leaf-retrieval-dataset.spec.ts` → `it('scores hit@1 recall@K and wrong_top on Q3 cosine-style rankings')`
- **Krytyczność:** critical
- **Logika:** `[czas-produkcji, dostawa]` ma recall, nie hit@1; odwrotna kolejność ma hit@1.
- **Wejście:** dwie listy slugów, `expectSlugs` Q3
- **Wyjście:** `{ hitAt1: false, recallAtK: true, wrongTop: true }` vs same `true/true/false`

### leaf-ds-003 — faq_miss

- **Kod:** `tests/api/domain/leaf-retrieval-dataset.spec.ts` → `it('treats empty ranking as success only for faq_miss gold')`
- **Krytyczność:** high
- **Logika:** brak liścia zwrotów = pusta lista; hit `gwarancja` na „zwroty?” to wrong_top.
- **Wejście:** `[]` vs `[{ slug: gwarancja }]`, gold M1
- **Wyjście:** sukces tylko dla pustej listy

### leaf-ds-004 — zrzut cosine 2026-09-15 = 4/7 hit@1

- **Kod:** `tests/api/domain/leaf-retrieval-dataset.spec.ts` → `it('locks cosine-only 2026-09-15 baseline at hit@1 4/7 and recall 7/7')`
- **Krytyczność:** high
- **Logika:** wcześniejszy test kalibracji jest bazą; rura nie może „poprawić” metryk przez zmianę zrzutu.
- **Wejście:** `docs/eval/leaf-retrieval-cosine-baseline-2026-09-15.json` `raw_top5`
- **Wyjście:** n=7, hit@1=4/7, recall=1, wrong_top=3/7
