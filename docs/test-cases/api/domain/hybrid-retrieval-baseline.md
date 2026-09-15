# Hybrid vs baseline cosine (siódemka)

Kod: `tests/api/domain/hybrid-retrieval-baseline.spec.ts`  
Zrzut: `docs/eval/leaf-retrieval-cosine-baseline-2026-09-15.json`  
Standard: [docs/test-cases/README.md](../../README.md)

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| hybrid-base-001 | critical | hit@1 ≥ 6/7; Q3 Q5 Q6 na #1 |

### hybrid-base-001 — Cel metryk po rurze

- **Kod:** `tests/api/domain/hybrid-retrieval-baseline.spec.ts` → `it('beats baseline hit@1 on the seven-case calibration set')`
- **Krytyczność:** critical
- **Logika:** `raw_top5` jako cosine; `hybridRankLeaves` + fixture `retrieval_text`.
- **Wejście:** 7 przypadków kalibracji
- **Wyjście:** recall 1; hit@1 ≥ 6/7; Q3/Q5/Q6 hitAt1
