# Vercel dashboard (bez proxy czatu)

Kod: `tests/deploy/dashboard-vercel.test.mjs`  
Standard: [docs/test-cases/README.md](../README.md)

Logika zestawu: panel operatora woła Nest z Bearer; nie dziedziczy rewrite
`/v1` widgetu na IP Hetznera.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| dash-deploy-001 | high | Brak rewrite `/v1` na Hetzner |

### dash-deploy-001 — Brak rewrite `/v1` na Hetzner

- **Kod:** `tests/deploy/dashboard-vercel.test.mjs` → `dashboard Vercel config does not rewrite /v1 to Hetzner`
- **Krytyczność:** high
- **Logika:** token dashboardu nie może iść przez publiczny rewrite widgetu.
- **Wejście:** `dashboard/vercel.json`
- **Wyjście:** brak `46.224.75.64` i brak ścieżki `/v1` w rewrite
