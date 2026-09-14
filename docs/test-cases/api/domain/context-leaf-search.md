# Wyszukiwanie liści (domena)

Kod: `tests/api/domain/context-leaf-search.spec.ts`  
Fixture: `tests/api/context-tree/in-memory/context-leaf-search-fixture.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: cosine powyżej progu + aktywny liść z niepustym `body` →
`{ slug, score }` bez `body`, max `CONTEXT_LEAF_SEARCH_TOP_K`. Gałąź,
nieaktywny, pusty body, niski score → `[]`.

Domyślny próg: `CONTEXT_LEAF_SEARCH_THRESHOLD = 0.49`, cap
`CONTEXT_LEAF_SEARCH_TOP_K = 4` (kalibracja PROD PL 2026-09-15: 0.8 → empty;
0.49+topK4 → recall@K = 1.0 na zestawie sondy).

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| leaf-search-001 | critical | Parafraza dostawy → slug `dostawa` |
| leaf-search-002 | critical | VIN / gałąź / nieaktywny / puste body → pusto |
| leaf-search-003 | high | Po progu wynik jest ucięty do topK |

### leaf-search-001 — Parafraza dostawy → slug `dostawa`

- **Kod:** `tests/api/domain/context-leaf-search.spec.ts` → `it('returns dostawa slug for a shipping paraphrase above threshold')`
- **Krytyczność:** critical
- **Logika:** podobieństwo wektorowe wskazuje liść; treść FAQ nie wraca w wyniku.
- **Wejście:** wektor zapytania `kiedy wyślecie dywaniki`, fixture, próg 0.49
- **Wyjście:** `[{ slug: 'dostawa', score >= 0.49 }]` bez `body`

### leaf-search-002 — VIN / gałąź / nieaktywny / puste body → pusto

- **Kod:** `tests/api/domain/context-leaf-search.spec.ts` → `it('returns empty for unknown topic, branch, inactive leaf, and empty body')`
- **Krytyczność:** critical
- **Logika:** brak sąsiada albo węzeł niekwalifikowany = brak sluga, nie zmyślamy faktu.
- **Wejście:** wektory VIN, `info`, `archiwum-gwarancja`, `chat-zapis`
- **Wyjście:** `[]` w każdym przypadku

### leaf-search-003 — Po progu wynik jest ucięty do topK

- **Kod:** `tests/api/domain/context-leaf-search.spec.ts` → `it('caps results to topK after threshold filter')`
- **Krytyczność:** high
- **Logika:** agent dostaje najwyżej K kandydatów do `lookup-leaf`, nie cały indeks.
- **Wejście:** trzy liście powyżej progu 0.5, `topK = 2`
- **Wyjście:** `['leaf-a', 'leaf-b']` (kolejność po score malejąco)
