# Testy

Wszystkie testy wykonywalne są w tym katalogu. Opisy przypadków (wejście, wyjście,
krytyczność) są w [`docs/test-cases/`](../docs/test-cases/README.md).

## Układ

```text
tests/
├── api/                  ← Jest (alias importu: @api/* → api/src/*)
│   ├── domain/           ← czysta logika domenowa
│   ├── chat/             ← kontrakt HTTP czatu, SSE, sesje
│   ├── agent-events/     ← zdarzenia dla dashboardu
│   ├── dashboard/        ← odczyt KPI / sesji
│   ├── lead/             ← resolver leada Bitrix
│   ├── mastra/           ← workflow intencji, Studio, narzędzia
│   ├── observability/    ← Sentry
│   ├── pricing/          ← resolver wyceny + adapter Supabase
│   ├── templates/        ← resolver kaskady + adapter Supabase
│   ├── context-tree/     ← resolver FAQ, embeddings, adapter Supabase
│   └── scripts/          ← node --test dla skryptów CLI
├── widget/               ← Vitest (alias: @widget/* → widget/src/*)
├── dashboard/            ← Vitest (alias: @dashboard/* → dashboard/src/*)
└── deploy/               ← node --test dla skryptów wdrożenia
```

## Uruchamianie

Z katalogu głównego: `npm test` (workspaces) + `npm run verify` (pełna bramka).
