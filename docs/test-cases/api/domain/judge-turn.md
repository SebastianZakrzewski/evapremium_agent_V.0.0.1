# Sędzia tury (retrieval i akcja)

Kod: `tests/api/domain/judge-turn.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: werdykt tury z doboru retrievalu albo narzędzia, bez treści
wiadomości i bez oceny stylu odpowiedzi.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| judge-001 | high | High + lookup #1 → pass |
| judge-002 | high | High nie #1 albo slug poza listą → fail |
| judge-003 | high | Ambiguous listed i miss w liście → pass |
| judge-004 | high | Brak searcha, drugi search, brak lookupu |
| judge-005 | medium | Pusty search i powitanie bez tooli |
| judge-006 | high | Wycena bez quote oraz narzędzie poza profilem |
| judge-007 | medium | Workflow i clarify bez tooli → pass |

### judge-001 — High + lookup #1 → pass

- **Kod:** `tests/api/domain/judge-turn.spec.ts` → `it('passes a high-confidence lookup of the first slug')`
- **Krytyczność:** high
- **Logika:** przy pewności high lookup pierwszego sluga z jednego searcha jest poprawnym doborem.
- **Wejście:** search `kolory`, `material-eva`, confidence high; lookup `kolory` / top / hit; narzędzia z allowlisty
- **Wyjście:** verdict pass, kody puste, slugi w tej kolejności; JSON bez tekstu klienta

### judge-002 — High nie #1 albo slug poza listą → fail

- **Kod:** `tests/api/domain/judge-turn.spec.ts` → `it('fails when high confidence lookup is not first or the slug is outside the list')`
- **Krytyczność:** high
- **Logika:** high wymaga pozycji 1; slug spoza rankingu jest zły także przy ambiguous.
- **Wejście:** listed przy high; `outside` przy ambiguous
- **Wyjście:** `lookup_not_top`; `lookup_outside`

### judge-003 — Ambiguous listed i miss w liście → pass

- **Kod:** `tests/api/domain/judge-turn.spec.ts` → `it('accepts a listed slug when confidence is ambiguous and a miss inside the list')`
- **Krytyczność:** high
- **Logika:** przy ambiguous wolno wziąć dalszy slug z listy; miss tego sluga nie jest złym doborem.
- **Wejście:** slugi `gwarancja`, `reklamacja`; lookup `reklamacja` listed miss
- **Wyjście:** retrieval pass, verdict pass

### judge-004 — Brak searcha, drugi search, brak lookupu

- **Kod:** `tests/api/domain/judge-turn.spec.ts` → `it('fails knowledge turns with no search, a second search, or hits without lookup')`
- **Krytyczność:** high
- **Logika:** tura wiedzy ma jeden search i lookup, gdy lista nie jest pusta.
- **Wejście:** zero searchy; dwa searche z lookupem #1; jeden search z hitami bez lookupu
- **Wyjście:** `no_search`; zawiera `second_search`; `no_lookup`

### judge-005 — Pusty search i powitanie bez tooli

- **Kod:** `tests/api/domain/judge-turn.spec.ts` → `it('passes an empty search without lookup and skips retrieval on a greeting profile')`
- **Krytyczność:** medium
- **Logika:** pusty ranking bez lookupu jest poprawny; profil bez searcha i lookupu pomija retrieval.
- **Wejście:** search `slugs: []`; profil bez wywołań
- **Wyjście:** retrieval pass; retrieval skipped i verdict pass

### judge-006 — Wycena bez quote oraz narzędzie poza profilem

- **Kod:** `tests/api/domain/judge-turn.spec.ts` → `it('passes the expected pricing tool without a quote and fails a tool outside the profile')`
- **Krytyczność:** high
- **Logika:** akcja to zgodność narzędzia z wykonaniem, nie fakt `quote_issued`. Narzędzie spoza allowlisty psuje akcję. Brak oczekiwanego toola też.
- **Wejście:** `quote-vehicle` przy execution tool; `search-leaves` przy pustej allowliście; execution tool bez wywołania
- **Wyjście:** pass z retrieval skipped; `tool_out_of_profile`; `missing_tool`

### judge-007 — Workflow i clarify bez tooli → pass

- **Kod:** `tests/api/domain/judge-turn.spec.ts` → `it('passes a workflow and clarify turn that called no tools')`
- **Krytyczność:** medium
- **Logika:** workflow i dopytanie bez narzędzi pomijają retrieval i zaliczają akcję.
- **Wejście:** execution workflow i clarify, puste listy
- **Wyjście:** oba verdict pass, retrieval skipped
