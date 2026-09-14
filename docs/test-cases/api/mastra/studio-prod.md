# Studio → Nest produkcyjny

Kod: `tests/api/scripts/studio-prod.test.mjs`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: lokalne Studio łączy się z Nest na tunelu (`:3000` + `/mastra`),
nie z `mastra dev`. Token nie jest w repo.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| studio-prod-001 | medium | Token z env albo z `api/.env` |
| studio-prod-002 | high | Argv: port 4111, host/port tunelu, prefix `/mastra` |
| studio-prod-003 | medium | Presety pokrywają każdy `ShopIntent` |

### studio-prod-001 — Token z env albo z `api/.env`

- **Kod:** `tests/api/scripts/studio-prod.test.mjs` → `reads token from env file without quotes`
- **Krytyczność:** medium
- **Logika:** skrypt nie może wymagać wklejenia tokenu do CLI ani commitowania `.env`.
- **Wejście:** linia `MASTRA_STUDIO_TOKEN=` albo `process.env`
- **Wyjście:** obcięty token; env procesu wygrywa z plikiem

### studio-prod-002 — Argv: port 4111, host/port tunelu, prefix `/mastra`

- **Kod:** `tests/api/scripts/studio-prod.test.mjs` → `builds Studio argv for Nest /mastra behind the SSH tunnel`
- **Krytyczność:** high
- **Logika:** CLI `mastra studio` nie ma `--url` / `--header`; Nest jest na tunelu `:3000`, UI na `:4111`.
- **Wejście:** ścieżka presetów
- **Wyjście:** `--port 4111 --server-host localhost --server-port 3000 --server-protocol http --server-api-prefix /mastra`; brak `--url` i `--header`

### studio-prod-003 — Presety pokrywają każdy `ShopIntent`

- **Kod:** `tests/api/scripts/studio-prod.test.mjs` → `request-context presets cover every ShopIntent`
- **Krytyczność:** medium
- **Logika:** `RequestContext.intent` w Studio ma te same wartości co tura czatu.
- **Wejście:** `api/mastra-request-context-presets.json`
- **Wyjście:** pięć kluczy = `product_info` / `pricing` / `delivery` / `after_sales` / `out_of_scope`
