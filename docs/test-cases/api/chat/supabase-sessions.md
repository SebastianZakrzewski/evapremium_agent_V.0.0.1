# Sesje czatu w `eva_bot` (istniejący schemat PROD)

Kod: `api/src/chat/supabase-chat-sessions.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: zapis na kolumnach już obecnych w PROD (`text`, `direction`
inbound/outbound), nie na migracji `body` z repo (tabele sesji już istnieją).

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| supabase-session-001 | high | User/assistant na `text` + `direction` |
| supabase-session-002 | high | Nieznana sesja |

### supabase-session-001 — User/assistant na `text` + `direction`

- **Kod:** `api/src/chat/supabase-chat-sessions.spec.ts` → `it('writes user/assistant onto existing eva_bot message columns')`
- **Krytyczność:** high
- **Logika:** transkrypt w Supabase; LLM nie jest magazynem.
- **Wejście:** `create` + append user `golf 8` + assistant `quoted`
- **Wyjście:** `listMessages` z `body`; surowy wiersz `direction: inbound/outbound`, kolumna `text`

### supabase-session-002 — Nieznana sesja

- **Kod:** `api/src/chat/supabase-chat-sessions.spec.ts` → `it('rejects an unknown session')`
- **Krytyczność:** high
- **Logika:** brak id w `chat_sessions` → `UnknownSessionError`.
- **Wejście:** `missing`
- **Wyjście:** wyjątek jak in-memory
