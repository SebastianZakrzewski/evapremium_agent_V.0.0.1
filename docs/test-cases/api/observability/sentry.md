# Sentry na API

Kod: `api/src/observability/init-sentry.spec.ts`,
`api/src/observability/report-unexpected-error.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: Nest inicjalizuje `@sentry/nestjs` tylko przy `SENTRY_DSN`.
Brak DSN = brak init (CI bez sieci do Sentry). DSN nie trafia do widgetu.
Filtr globalny nie widzi błędów zjedzonych w SSE — te zgłasza
`reportUnexpectedError` (bez `HttpException`).

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| sentry-001 | medium | Brak DSN → brak init |
| sentry-002 | medium | DSN → Sentry.init bez PII w ciele HTTP |
| sentry-003 | medium | Health check nie jest transakcją |
| sentry-004 | high | SSE: nie zgłaszaj 404/400 |
| sentry-005 | high | SSE: zgłoś nieoczekiwany błąd |
| sentry-006 | low | Sonda Sentry tylko z env |
| sentry-007 | low | Sonda to Error, nie HttpException |

### sentry-001 — Brak DSN → brak init

- **Kod:** `api/src/observability/init-sentry.spec.ts` → `it('does not initialize when SENTRY_DSN is missing')`
- **Krytyczność:** medium
- **Logika:** `verify` i lokalne API bez env nie dzwonią do Sentry.
- **Wejście:** puste env, mock `init`
- **Wyjście:** `false`, `init` nie wywołane

### sentry-002 — DSN → Sentry.init bez PII w ciele HTTP

- **Kod:** `api/src/observability/init-sentry.spec.ts` → `it('initializes the Nest SDK from SENTRY_DSN without user or HTTP body collection')`
- **Krytyczność:** medium
- **Logika:** obserwowalność API jest po stronie serwera; treść czatu nie idzie w body eventu.
- **Wejście:** `SENTRY_DSN` przykładowy ingest URL, mock `init`
- **Wyjście:** `true`, `init` z `userInfo: false`, `httpBodies: []`, `tracesSampleRate: 0.2`

### sentry-003 — Health check nie jest transakcją

- **Kod:** `api/src/observability/init-sentry.spec.ts` → `it('drops health-check transactions')`
- **Krytyczność:** medium
- **Logika:** CD i monitoring nie mają zaśmiecać performance.
- **Wejście:** `beforeSendTransaction({ transaction: 'GET /v1/health' })`
- **Wyjście:** `null`; `POST /v1/sessions` zostaje

### sentry-004 — SSE: nie zgłaszaj 404/400

- **Kod:** `api/src/observability/report-unexpected-error.spec.ts` → `it('does not report Nest HTTP exceptions (expected client errors)')`
- **Krytyczność:** high
- **Logika:** nieznana sesja / zły request to kontrakt, nie awaria.
- **Wejście:** obiekt z `getStatus`/`getResponse` (kształt `HttpException`)
- **Wyjście:** `capture` nie wywołane

### sentry-005 — SSE: zgłoś nieoczekiwany błąd

- **Kod:** `api/src/observability/report-unexpected-error.spec.ts` → `it('reports unexpected failures that the chat stream would otherwise swallow')`
- **Krytyczność:** high
- **Logika:** `catch` w kontrolerze czatu zamiata wyjątek przed filtrem Nest.
- **Wejście:** `Error('supabase insert failed')`
- **Wyjście:** `capture` z tym błędem

### sentry-006 — Sonda Sentry tylko z env

- **Kod:** `api/src/observability/sentry-debug-probe.spec.ts` → `it('is off unless SENTRY_DEBUG_PROBE=1')`
- **Krytyczność:** low
- **Logika:** publiczny GET nie rzuca błędu testowego bez flagi na serwerze.
- **Wejście:** puste env vs `SENTRY_DEBUG_PROBE=1`
- **Wyjście:** `false` / `true`

### sentry-007 — Sonda to Error, nie HttpException

- **Kod:** `api/src/observability/sentry-debug-probe.spec.ts` → `it('builds an unexpected Error for Sentry (not an HTTP exception)')`
- **Krytyczność:** low
- **Logika:** filtr Sentry ma zgłosić ten błąd (nie 404).
- **Wejście:** `sentryDebugError()`
- **Wyjście:** `Error` o treści `EVA Sentry probe`, bez `getStatus`
