# Ewaluacja skuteczności agenta (FAQ / tool-e)

Kod: `tests/api/mastra/eval/agent-effectiveness.spec.ts` (scorer),
`tests/api/mastra/eval/agent-effectiveness.live.spec.ts` (DeepSeek, env
`EVAL_AGENT_EFFECTIVENESS=1`).  
Standard: [docs/test-cases/README.md](../../README.md)

Logika: 8 scenariuszy → M1–M7 (0/1), rate 0–100, suma ważona
(10+15+20+20+15+15+5). Live nie jest częścią `npm run verify`.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| agent-eval-001 | high | Czysty FAQ search→lookup → same 1 |
| agent-eval-002 | high | Lookup spoza search + zmyślony zwrot → M3/M4/M5 = 0 |
| agent-eval-003 | medium | Agregat 0–100 i weighted 100 |

### agent-eval-001 — Czysty FAQ

- **Kod:** `tests/api/mastra/eval/agent-effectiveness.spec.ts` → `it('scores a clean FAQ search-then-lookup hit as all ones except maybe intent')`
- **Krytyczność:** high
- **Logika:** procedura tury spełniona.
- **Wejście:** search `gwarancja`, lookup hit, odpowiedź „1 rok”
- **Wyjście:** wszystkie M1–M7 = 1

### agent-eval-002 — Halucynacja sluga

- **Kod:** `tests/api/mastra/eval/agent-effectiveness.spec.ts` → `it('fails slug hallucination and scenario when lookup is invented')`
- **Krytyczność:** high
- **Logika:** slug spoza search i polityka zwrotu bez hitu.
- **Wejście:** pusty search, lookup `zwroty`, tekst o 14 dniach
- **Wyjście:** M3=M4=M5=0

### agent-eval-003 — Agregat

- **Kod:** `tests/api/mastra/eval/agent-effectiveness.spec.ts` → `it('aggregates rates 0-100 and a weighted total')`
- **Krytyczność:** medium
- **Logika:** dwa passy → 100 / weighted 100
- **Wejście:** dwa identyczne ślady FAQ
- **Wyjście:** `rates.m1_intent=100`, `weighted=100`
