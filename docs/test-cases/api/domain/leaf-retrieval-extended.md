# Extended leaf retrieval dataset i eval offline

Kod: `tests/api/domain/leaf-retrieval-extended.spec.ts`  
Dataset: `api/src/domain/leaf-retrieval-extended-dataset.ts`  
Raport: `docs/eval/leaf-retrieval-extended-summary.json`  
Standard: [docs/test-cases/README.md](../../README.md)

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| ext-ds-001 | high | ≥100 przypadków, unikalne id, intencje |
| ext-ds-002 | high | Złote slugi ⊆ korpus eval |
| ext-ev-001 | critical | FAQ recall@K; kolizje hardNegatives hit@1 hybrid > cosine |
| ext-ev-002 | medium | faq_miss false-positive rate ≤ 0.65 (score gate) |

### ext-ds-001 — Rozmiar i pokrycie datasetu

- **Kod:** `tests/api/domain/leaf-retrieval-extended.spec.ts` → `it('has at least 100 cases across business areas')`
- **Krytyczność:** high
- **Logika:** `buildExtendedLeafRetrievalDataset()` ≥ 100; unikalne `id`; intencje product/delivery/after_sales/pricing/out_of_scope.
- **Wejście:** stały korpus pytań w repo
- **Wyjście:** asercje struktury

### ext-ds-002 — Slugi w korpusie FAQ

- **Kod:** `tests/api/domain/leaf-retrieval-extended.spec.ts` → `it('references only corpus slugs for FAQ gold')`
- **Krytyczność:** high
- **Logika:** `kind: faq` → każdy `expectSlugs` w `LEAF_RETRIEVAL_EVAL_CORPUS`.
- **Wejście:** `LEAF_RETRIEVAL_EXTENDED_DATASET`
- **Wyjście:** brak nieznanych slugów

### ext-ev-001 — Offline eval FAQ

- **Kod:** `tests/api/domain/leaf-retrieval-extended.spec.ts` → `it('meets FAQ recall@K and collision hit@1 lift on offline proxy')`
- **Krytyczność:** critical
- **Logika:** TF-IDF na `retrieval_text` + ta sama rura co PROD (`searchContextLeaves` → `hybridRankLeaves`); K=4; podzbiór z `hardNegatives`.
- **Wejście:** pełny extended dataset + kolizje
- **Wyjście:** recall@K hybrid ≥ cosine i ≥ 0.9; na kolizjach hit@1 hybrid > cosine

### ext-ev-002 — faq_miss

- **Kod:** `tests/api/domain/leaf-retrieval-extended.spec.ts` → `it('reports miss false-positive rate for faq_miss')`
- **Krytyczność:** medium
- **Logika:** pytania cennik/zwroty/poza zakresem — `falsePositiveRate` = udział z niepustym top-1 hybrid.
- **Wejście:** grupy `ext-miss-*`
- **Wyjście:** rate zdefiniowany; ≤ 0.85 (proxy offline, nie PROD)
