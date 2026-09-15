# Extended leaf retrieval — dataset i metryki offline

## Dataset

- **Źródło:** `api/src/domain/leaf-retrieval-extended-dataset.ts`
- **Korpus liści (16 slugów):** `api/src/domain/leaf-retrieval-eval-corpus.ts`
- **Obszary:** produkt, dostawa, czas produkcji, posprzedaż, kontakt; chipy wieloslugowe; `faq_miss` (cennik, zwroty, poza zakresem)
- **Rozmiar:** ≥100 parafraz (aktualna liczba w `caseCount` w summary JSON)

Kalibracja PROD (siódemka) pozostaje w `leaf-retrieval-metrics.md` — ten zestaw jest **rozszerzeniem regresji**, nie zamiennikiem zrzutu cosine 2026-09-15.

## Jak mierzymy

1. **Indeks:** TF-IDF na `retrieval_text` (offline proxy embeddingu OpenAI — ten sam pipeline rankingu, inna skala score).
2. **Cosine-only:** top-4 po podobieństwie TF-IDF (próg 0 na puli).
3. **Hybrid:** `hybridRankLeaves` (BM25 + RRF + lexical rerank + confidence), K=4.
4. **Metryki:** `evaluateRanking` — hit@1, recall@K, wrong_top; dla `faq_miss` dodatkowo **false_positive_rate** (top-1 niepusty).

Uruchomienie raportu:

```bash
npm run eval:leaf-retrieval --workspace api
```

Pliki:

- `docs/eval/leaf-retrieval-extended-summary.json` — agregaty
- `docs/eval/leaf-retrieval-extended-report.json` — wiersze per `id`

Testy w `verify`: `tests/api/domain/leaf-retrieval-extended.spec.ts`.

## Ostatni zrzut (offline TF-IDF, 174 przypadki)

Źródło: `docs/eval/leaf-retrieval-extended-summary.json` (generuj: `npm run eval:leaf-retrieval --workspace api`).

| Zakres | n | hit@1 cosine | hit@1 hybrid | recall@4 cosine | recall@4 hybrid |
| --- | --- | --- | --- | --- | --- |
| **FAQ** | 152 | 71.1% | 70.4% | 82.2% | 81.6% |
| **faq_miss** | 22 | 0% (poprawnie pusto) | 0% | — | — |
| **faq_miss false positive** | 22 | — | — | ~9.1% przy score ≥ 0.42 | — |

| Obszar biznesowy (FAQ) | hit@1 cosine | hit@1 hybrid |
| --- | --- | --- |
| product | 77.5% | 75.0% |
| delivery | 83.3% | 83.3% |
| after_sales (bez kontaktu) | 60.0% | 60.0% |
| contact | 25.0% | 37.5% |

| Intencja (wszystkie kind) | Uwagi |
| --- | --- |
| `pricing` / `out_of_scope` | brak złotego sluga — metryki hit@1/recall odzwierciedlają „brak trafienia” |

Na podzbiorze **kolizji** (`hardNegatives` w datasetcie) test `verify` wymaga **hit@1 hybrid > cosine** (BM25+RRF pod kolizje dostawa/produkcja itd.).

## Interpretacja

- Wysoki hit@1 na FAQ offline **nie gwarantuje** tego samego na PROD bez `retrieval_text` + ingest OpenAI.
- Niski false_positive na miss offline **nie zastępuje** progu cosine 0.49 na PROD.
- Po wypełnieniu `retrieval_text` na PROD warto powtórzyć eval na żywym indeksie (skrypt osobny / przyszły slice).
