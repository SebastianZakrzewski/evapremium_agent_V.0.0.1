# Zdarzenia domenowe agenta

Kod: `tests/api/agent-events/agent-events.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: Nest dopisuje fakty tury (kaskada, wycena, drzewo, lead,
intencja, awaria toola) bez treści wiadomości. Slice 1: adapter in-memory.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| events-001 | high | Kaskada 0/1/N → cascade_resolved |
| events-002 | critical | quote_issued tylko z macierzy |
| events-011 | critical | quote-vehicle: quote_issued tylko przy quoted |
| events-003 | high | Hit i miss drzewa bez body |
| events-004 | critical | lead_attempted zgoda i skip |
| events-005 | high | intent_accepted bez tekstu użytkownika |
| events-006 | medium | tool_failed bez kopii czatu |
| events-009 | medium | Konsola: użyte narzędzie z id toola |
| events-010 | medium | Bufor logu kontenera: tura i narzędzie, bez treści czatu |
| events-012 | high | Lustro drzewa: ranking i zgodność lookupu, bez pytania |
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

### events-011 — quote-vehicle: quote_issued tylko przy quoted

- **Kod:** `tests/api/agent-events/agent-events.spec.ts` → `it('records quote_issued from quote-vehicle only when the composition quotes')`
- **Krytyczność:** critical
- **Logika:** składanie Golf 8 hatch + wariant emituje kwotę; `many` bez nadwozia nie emituje drugiej kwoty.
- **Wejście:** `quoteVehicle` z `hatchback` i `komplet-5szt`, potem samo `vw` / `golf 8`
- **Wyjście:** jeden `quote_issued` `{ amount: 599, currency: 'PLN' }`

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
- **Logika:** zaakceptowana intencja tury i ślad decyzji, nie kopia wiadomości.
- **Wejście:** `MastraChatAgent.stream` z pytaniem o cenę bez marki
- **Wyjście:** `intent_accepted` `{ intent: 'pricing' }` oraz `decision_trace` z `execution: workflow` i `workflow: quote_vehicle`; JSON bez pytania

### events-006 — tool_failed bez kopii czatu

- **Kod:** `tests/api/agent-events/agent-events.spec.ts` → `it('records tool_failed without chat copy when a shop tool throws')`
- **Krytyczność:** medium
- **Logika:** awaria toola to `toolId`, nie komunikat wyjątku z czatu.
- **Wejście:** `executeShopTool` rzuca Error z tekstem użytkownika
- **Wyjście:** `{ toolId: 'quote-price' }`; JSON bez tego tekstu

### events-009 — Konsola: użyte narzędzie z id toola

- **Kod:** `tests/api/agent-events/agent-events.spec.ts` → `it('logs the shop tool id when a tool runs')`
- **Krytyczność:** medium
- **Logika:** każde wywołanie shop-toola dopisuje jedną linię konsoli z id, zanim tool wykona się albo rzuci.
- **Wejście:** `executeShopTool` z id `search-leaves`
- **Wyjście:** `użyte narzędzie: "search-leaves"`

### events-010 — Bufor logu kontenera: tura i narzędzie, bez treści czatu

- **Kod:** `tests/api/agent-events/container-log-buffer.spec.ts` → `it('keeps an intent block and a tool line in order, without message text')`, `it('records the console intent block and the used-tool line in the process buffer')`
- **Krytyczność:** medium
- **Logika:** panel pod grafem czyta ten sam ślad co stdout: blok tury (w tym sub-intencja, tryb, wykonanie, cel) i id toola. Treść wiadomości klienta do bufora nie wchodzi.
- **Wejście:** tura `session-1` product_info → delivery z toolami `search-leaves`, `lookup-leaf`; potem `executeShopTool` `quote-price`
- **Wyjście:** kolejność `intent-turn`, `tool`; `list(1)` zwraca tylko drugą linię; `list(99)` po restarcie (kursor większy niż ostatni seq) zwraca cały bufor; JSON bez treści pytania

### events-012 — Lustro drzewa: ranking i zgodność lookupu, bez pytania

- **Kod:** `tests/api/agent-events/tree-turn-log.spec.ts` → `it('prints branch rank and leaf lookup without the question or leaf body')`, `it('mirrors search and lookup in the process buffer')`
- **Krytyczność:** high
- **Logika:** operator widzi w buforze kontenera, które gałęzie i liście wybrała rura oraz czy `lookup-leaf` trafił w ten ranking. Pytanie i `body` do logu nie wchodzą.
- **Wejście:** format bez koloru (`kolory` / `material-eva`, pudło, `w rankingu`); `searchLeaves` „kiedy wyślecie dywaniki” z preferencją `info`, potem lookup `dostawa` i `pielegnacja`
- **Wyjście:** blok `[drzewo]` z gałęziami, rankingiem, liśćmi i pewnością `wysoka`; w buforze `tree-search` (`info`, liść `dostawa`) oraz lookup `hit`/`#1` i `miss`/`poza rankingiem`; JSON bez pytania i bez „Wysyłka w 5–7 dni”



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

