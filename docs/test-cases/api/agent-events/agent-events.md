# Zdarzenia domenowe agenta

Kod: `tests/api/agent-events/agent-events.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: Nest dopisuje fakty tury (kaskada, wycena, drzewo, lead,
intencja, awaria toola) bez treści wiadomości. Slice 1: adapter in-memory.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| events-001 | high | Kaskada 0/1/N → cascade_resolved |
| events-002 | critical | quote_issued tylko z macierzy |
| events-003 | high | Hit i miss drzewa bez body |
| events-004 | critical | lead_attempted zgoda i skip |
| events-005 | high | intent_accepted bez tekstu użytkownika |
| events-006 | medium | tool_failed bez kopii czatu |
| events-007 | high | Stub czatu emituje wycenę w sesji |
| events-008 | high | context_search bez body FAQ |

### events-001 — Kaskada 0/1/N → cascade_resolved

- **Kod:** `tests/api/agent-events/agent-events.spec.ts` → `it('records cascade none/one/many without message text')`
- **Krytyczność:** high
- **Logika:** operator widzi wynik kaskady jako fakt Nest, nie z tekstu modelu.
- **Wejście:** `runWithTurnSession`, `resolveTemplate` brak / Golf 8 kombi / samo `vw`
- **Wyjście:** trzy `cascade_resolved` z `match: none|one|many`; JSON bez treści czatu

### events-002 — quote_issued tylko z macierzy

- **Kod:** `tests/api/agent-events/agent-events.spec.ts` → `it('records quote_issued only when the matrix returns an amount')`
- **Krytyczność:** critical
- **Logika:** kwota na osi tylko gdy macierz zwróciła amount.
- **Wejście:** poprawny wariant `komplet-5szt` oraz nieznany wariant
- **Wyjście:** jeden event `{ amount: 599, currency: 'PLN' }`

### events-003 — Hit i miss drzewa bez body

- **Kod:** `tests/api/agent-events/agent-events.spec.ts` → `it('records context_hit and context_miss without leaf body')`
- **Krytyczność:** high
- **Logika:** payload ma slug, nie treść liścia.
- **Wejście:** `lookupLeaf('dostawa')`, `lookupLeaf('pielegnacja')`
- **Wyjście:** `context_hit` / `context_miss`; JSON bez body FAQ

### events-004 — lead_attempted zgoda i skip

- **Kod:** `tests/api/agent-events/agent-events.spec.ts` → `it('records lead_attempted for consent and skip outcomes')`
- **Krytyczność:** critical
- **Logika:** próba leada jest faktem niezależnie od Bitrix.
- **Wejście:** `LeadAttemptService.create` (Nest `LeadService` dziedziczy) zgoda+mail, potem brak zgody
- **Wyjście:** `outcome: created` oraz `skipped_no_consent`

### events-005 — intent_accepted bez tekstu użytkownika

- **Kod:** `tests/api/agent-events/agent-events.spec.ts` → `it('records intent_accepted from the Mastra chat turn without the user text')`
- **Krytyczność:** high
- **Logika:** zaakceptowana intencja tury, nie kopia wiadomości.
- **Wejście:** `MastraChatAgent.stream` z pytaniem o cenę
- **Wyjście:** `{ intent: 'pricing' }`; JSON bez pytania

### events-006 — tool_failed bez kopii czatu

- **Kod:** `tests/api/agent-events/agent-events.spec.ts` → `it('records tool_failed without chat copy when a shop tool throws')`
- **Krytyczność:** medium
- **Logika:** awaria toola to `toolId`, nie komunikat wyjątku z czatu.
- **Wejście:** `executeShopTool` rzuca Error z tekstem użytkownika
- **Wyjście:** `{ toolId: 'quote-price' }`; JSON bez tego tekstu

### events-007 — Stub czatu emituje wycenę w sesji

- **Kod:** `tests/api/agent-events/agent-events.spec.ts` → `it('emits quote_issued when the stub chat agent quotes in a session')`
- **Krytyczność:** high
- **Logika:** `sessionId` z `handle` trafia do ALS i do eventu.
- **Wejście:** `postChatMessage` stub `quote passenger_car komplet-5szt`
- **Wyjście:** `quote_issued` na `session-stub`

### events-008 — context_search bez body FAQ

- **Kod:** `tests/api/agent-events/agent-events.spec.ts` → `it('records context_search slugs without leaf body')`
- **Krytyczność:** high
- **Logika:** wyszukiwanie semantyczne emituje slugi, nie treść liścia.
- **Wejście:** `searchLeaves` parafraza dostawy oraz VIN
- **Wyjście:** `matched: true` ze `dostawa`; potem pusta lista; JSON bez body FAQ

