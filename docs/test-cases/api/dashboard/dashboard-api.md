# API odczytu dashboardu

Kod: `tests/api/dashboard/dashboard-read.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: Bearer `DASHBOARD_TOKEN` (≠ Studio), CORS tylko origin
dashboardu, KPI i znaczniki z eventów Nest, nie z tekstu agenta.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| dash-api-001 | critical | Brak Bearer i token Studio → 401 |
| dash-api-002 | high | Token = Studio → odrzucony |
| dash-api-003 | high | CORS tylko DASHBOARD_ORIGIN |
| dash-api-004 | high | Shop origin bez ACAO na `/v1/dashboard` |
| dash-api-005 | critical | KPI doby z eventów |
| dash-api-006 | high | Znaczniki sesji z typów eventów |
| dash-api-007 | high | Transkrypt + oś eventów |
| dash-api-008 | medium | Sort osi po occurredAt |

### dash-api-001 — Brak Bearer i token Studio → 401

- **Kod:** `tests/api/dashboard/dashboard-read.spec.ts` → `it('rejects missing bearer and the studio token')`
- **Krytyczność:** critical
- **Logika:** bez sekretu dashboardu brak odczytu sesji i transkryptu.
- **Wejście:** brak nagłówka; `Bearer` tokenu Studio
- **Wyjście:** `dashboardBearerOk` false; `Bearer` DASHBOARD_TOKEN true

### dash-api-002 — Token = Studio → odrzucony

- **Kod:** `tests/api/dashboard/dashboard-read.spec.ts` → `it('rejects dashboard token when it equals the studio token')`
- **Krytyczność:** high
- **Logika:** `DASHBOARD_TOKEN` ≠ `MASTRA_STUDIO_TOKEN`.
- **Wejście:** oba sekrety `same`
- **Wyjście:** false

### dash-api-003 — CORS tylko DASHBOARD_ORIGIN

- **Kod:** `tests/api/dashboard/dashboard-read.spec.ts` → `it('allows only DASHBOARD_ORIGIN, not shop origins')`
- **Krytyczność:** high
- **Logika:** widget i sklep nie dostają CORS na panel.
- **Wejście:** origin sklepu vs `https://dash.vercel.app`
- **Wyjście:** sklep undefined; dash echo origin

### dash-api-004 — Shop origin bez ACAO na `/v1/dashboard`

- **Kod:** `tests/api/dashboard/dashboard-read.spec.ts` → `it('does not set ACAO for a shop origin on dashboard paths')`
- **Krytyczność:** high
- **Logika:** middleware dashboardu (po CORS sklepu) zdejmuje ACAO sklepu.
- **Wejście:** path `/v1/dashboard/summary`, Origin sklepu, nagłówek ACAO sklepu już ustawiony
- **Wyjście:** brak `Access-Control-Allow-Origin`

### dash-api-005 — KPI doby z eventów

- **Kod:** `tests/api/dashboard/dashboard-read.spec.ts` → `it('counts four hypotheses from events, not agent text')`
- **Krytyczność:** critical
- **Logika:** odciążenie / wycena / prawda / lead z typów eventów.
- **Wejście:** fixture sesji relief, miss, quote bez kaskady one, skip leada
- **Wyjście:** relief 2; quote issued 2 + 1 naruszenie; miss 1; skipped 1

### dash-api-006 — Znaczniki sesji z typów eventów

- **Kod:** `tests/api/dashboard/dashboard-read.spec.ts` → `it('lists session markers from event types')`
- **Krytyczność:** high
- **Logika:** filtr jednego wymiaru z eventów, nie z tekstu.
- **Wejście:** `listSessionMarkers(events, 'violation')`
- **Wyjście:** sesja `s-bad-quote` z markerami cascade/quote/violation

### dash-api-007 — Transkrypt + oś eventów

- **Kod:** `tests/api/dashboard/dashboard-read.spec.ts` → `it('joins transcript direction/text with timed events')`
- **Krytyczność:** high
- **Logika:** widok sesji składa `direction`/`text` z eventami po `occurredAt`.
- **Wejście:** dwa komunikaty + dwa eventy w odwrotnej kolejności
- **Wyjście:** inbound/outbound + eventy 1 potem 2

### dash-api-008 — Sort osi po occurredAt

- **Kod:** `tests/api/dashboard/dashboard-read.spec.ts` → `it('orders session events by occurredAt')`
- **Krytyczność:** medium
- **Logika:** oś czasu eventów jest niezależna od kolejności tablicy.
- **Wejście:** event 2 przed eventem 1
- **Wyjście:** id `1`, potem `2`
