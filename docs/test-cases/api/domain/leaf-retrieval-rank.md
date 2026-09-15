# Hybrid ranking liści (BM25, RRF, rerank)

Kod: `tests/api/domain/leaf-retrieval-rank.spec.ts`  
Implementacja: `api/src/domain/leaf-retrieval-rank.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| leaf-rank-001 | high | Q3 BM25 preferuje dostawa |
| leaf-rank-002 | high | hybridRankLeaves naprawia zły cosine top-1 |

### leaf-rank-001 — Q3 BM25

- **Kod:** `tests/api/domain/leaf-retrieval-rank.spec.ts` → `it('ranks dostawa above czas-produkcji for Q3 on BM25')`
- **Krytyczność:** high
- **Logika:** rozłączny `retrieval_text` rozstrzyga kolizję leksykalnie.
- **Wejście:** query Q3, dwa dokumenty fixture
- **Wyjście:** pierwszy slug `dostawa`

### leaf-rank-002 — hybridRankLeaves

- **Kod:** `tests/api/domain/leaf-retrieval-rank.spec.ts` → `it('hybridRankLeaves puts dostawa first when cosine favors produkcja')`
- **Krytyczność:** high
- **Logika:** pełna rura bez `body` w wyniku.
- **Wejście:** cosine `[czas-produkcji, dostawa]`, query Q3
- **Wyjście:** `#1 dostawa`, pole `confidence`
