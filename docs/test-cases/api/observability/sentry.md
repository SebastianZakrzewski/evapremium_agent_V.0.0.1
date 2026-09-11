# Sentry na API

Kod: `api/src/observability/init-sentry.spec.ts`  
Standard: [docs/test-cases/README.md](../README.md)

Logika zestawu: Nest inicjalizuje `@sentry/node` tylko przy `SENTRY_DSN`.
Brak DSN = brak init (CI bez sieci do Sentry). DSN nie trafia do widgetu.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| sentry-001 | medium | Brak DSN → brak init |
| sentry-002 | medium | DSN → Sentry.init |

### sentry-001 — Brak DSN → brak init

- **Kod:** `api/src/observability/init-sentry.spec.ts` → `it('does not initialize when SENTRY_DSN is missing')`
- **Krytyczność:** medium
- **Logika:** `verify` i lokalne API bez env nie dzwonią do Sentry.
- **Wejście:** puste env, mock `init`
- **Wyjście:** `false`, `init` nie wywołane

### sentry-002 — DSN → Sentry.init

- **Kod:** `api/src/observability/init-sentry.spec.ts` → `it('initializes the Node SDK from SENTRY_DSN')`
- **Krytyczność:** medium
- **Logika:** obserwowalność API jest po stronie serwera, z env Nest.
- **Wejście:** `SENTRY_DSN` przykładowy ingest URL, mock `init`
- **Wyjście:** `true`, `init({ dsn })`
