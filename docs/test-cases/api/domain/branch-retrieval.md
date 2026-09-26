# Retrieval gałęzi

Kod: `tests/api/domain/branch-retrieval.spec.ts`

Logika zestawu: bonus gałęzi jest miękki. Pytanie o kolory trafia w gałąź
i liść kolorów. Puste `relatedBranches` nie zmienia rury liścia.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| branch-001 | high | Bonus nie zbija dużej luki |
| branch-002 | high | Kolory: hit gałęzi i liścia |

### branch-001 — Bonus nie zbija dużej luki

- **Kod:** `tests/api/domain/branch-retrieval.spec.ts` → `it('boosts a close branch without overriding a wide score gap')`
- **Krytyczność:** high
- **Logika:** `relatedBranches` premiuje bliski ranking i nie wymusza gałęzi przy dużej różnicy score.
- **Wejście:** pary score 0.2/0.05 oraz 0.1/0.09, preferencja `kolory`
- **Wyjście:** pierwsza para zostaje przy `material`; druga wygrywa `kolory`

### branch-002 — Kolory: hit gałęzi i liścia

- **Kod:** `tests/api/domain/branch-retrieval.spec.ts` → `it('ranks the colors branch and leaf first for a color question')`
- **Krytyczność:** high
- **Logika:** Wektor + BM25 + RRF stawia `kolory` na #1, liść `kolory-oferta` też. Pusta lista bonusów zwraca ten sam ranking co `hybridSearchLeaves`.
- **Wejście:** query `jakie kolory`, wektor `[1, 0]`, gałęzie `kolory` i `material`
- **Wyjście:** hit@1 gałęzi i liścia; `material` nadal w rankingu gałęzi; ślad `explainLeafRetrieval` ma preferencję `kolory`, ranking gałęzi od `kolory` i liść `kolory-oferta` na #1, a kolejność hitów jest taka sama jak `hierarchicalSearchLeaves`
