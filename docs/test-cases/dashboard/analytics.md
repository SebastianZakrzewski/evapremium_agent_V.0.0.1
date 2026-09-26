# Dashboard — analityka

Kod: `tests/dashboard/App.test.tsx`  
Standard: [docs/test-cases/README.md](../README.md)

Logika zestawu: zakładka `#/analityka` pokazuje udział tur pass, powód fail
i link do sesji z odpowiedzi `GET /v1/dashboard/analytics`.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| dash-analytics-001 | high | Skuteczność, powód i link do sesji |

### dash-analytics-001 — Skuteczność, powód i link do sesji

- **Kod:** `tests/dashboard/App.test.tsx` → `it('shows pass counts, failure reasons and a session link')`
- **Krytyczność:** high
- **Logika:** operator widzi 3 z 4 oraz powód `lookup_outside` i schodzi do sesji. Odpytanie idzie z Bearer na `/v1/dashboard/analytics`.
- **Wejście:** hash `#/analityka`, data `2026-09-26`, fixture 4 tur / 1 fail `session-miss`
- **Wyjście:** nagłówki Analityka i `3 z 4`; tekst „Slug spoza rankingu”; href `#/sessions/session-miss`
