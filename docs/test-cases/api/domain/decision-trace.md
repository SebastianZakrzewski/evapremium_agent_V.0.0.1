# Ślad decyzji

Kod: `tests/api/domain/decision-trace.spec.ts`

Logika zestawu: event diagnostyczny niesie tylko pola routingu.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| trace-001 | high | Payload bez treści wiadomości |

### trace-001 — Payload bez treści wiadomości

- **Kod:** `tests/api/domain/decision-trace.spec.ts` → `it('keeps the payload to routing fields')`
- **Krytyczność:** high
- **Logika:** Ślad decyzji nie jest transkryptem. Zapis tury w evencie czatu jest w `agent-events`.
- **Wejście:** intent `pricing`, sub-intent `indicative_quote`, mode `action`, workflow `quote_vehicle`; obok tekst pytania klienta
- **Wyjście:** klucze `intent`, `sub_intent`, `mode`, `execution`, `workflow`; JSON bez treści pytania
