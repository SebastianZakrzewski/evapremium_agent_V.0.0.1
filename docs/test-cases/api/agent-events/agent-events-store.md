# Persystencja zdarzeń agenta

Kod: `tests/api/agent-events/supabase-agent-events.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: ten sam kontrakt co in-memory, zapis do `eva_bot.agent_events`
(fixture `MemoryDataStore`). **Bez apply migracji na PROD.**

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| events-store-001 | high | Zapis jak in-memory na kolumnach tabeli |
| events-store-002 | high | In-memory: sesja i zakres czasu |
| events-store-003 | high | Adapter: sesja i zakres doby |

### events-store-001 — Zapis jak in-memory na kolumnach tabeli

- **Kod:** `tests/api/agent-events/supabase-agent-events.spec.ts` → `it('writes the same contract as in-memory onto eva_bot.agent_events')`
- **Krytyczność:** high
- **Logika:** dashboard czyta fakty Nest, nie transkrypt.
- **Wejście:** `append` `quote_issued` session-1, amount 599
- **Wyjście:** `listBySession` z payloadem; surowy wiersz `session_id` / `type` / `payload`

### events-store-002 — In-memory: sesja i zakres czasu

- **Kod:** `tests/api/agent-events/supabase-agent-events.spec.ts` → `it('lists events for one session and a time range')`
- **Krytyczność:** high
- **Logika:** odczyt po `session_id` i oknie czasu, nie full-text.
- **Wejście:** trzy eventy (dwie sesje, dwa dni)
- **Wyjście:** `listBySession('session-a')` dwa eventy; zakres 13.09 dwa eventy doby

### events-store-003 — Adapter: sesja i zakres doby

- **Kod:** `tests/api/agent-events/supabase-agent-events.spec.ts` → `it('filters supabase rows by session and day range')`
- **Krytyczność:** high
- **Logika:** ten sam kontrakt odczytu na adapterze za `DataStore`.
- **Wejście:** trzy wiersze fixture
- **Wyjście:** sesja a: e1+e3; doba 13.09: e1+e2
