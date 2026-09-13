# Deploy skryptu kontenera (Hetzner)

Kod: `deploy/update-container.test.mjs`  
Standard: [docs/test-cases/README.md](../README.md)

Logika zestawu: obraz Dockera buduje się z klona repo; sekrety zostają w
`--env-file`, nie w skrypcie.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| deploy-001 | high | Rebuild z env-file, bez sekretów w skrypcie |
| deploy-002 | high | Wolumen LibSQL + DuckDB Mastry, bez tokenu Studio w skrypcie |
| deploy-003 | high | Drugi obraz Studio na 4111, bez sekretów w skrypcie |

### deploy-001 — Rebuild z env-file, bez sekretów w skrypcie

- **Kod:** `deploy/update-container.test.mjs` → `rebuilds the named image from the clone root and keeps secrets in env-file`
- **Krytyczność:** high
- **Logika:** CD na VPS nie może wklejać kluczy do `docker build`; musi podmienić kontener z `/opt/evabot/api/.env`.
- **Wejście:** treść `deploy/update-container.sh`
- **Wyjście:** `docker build` + `docker run --env-file` na porcie 3000; pętla gotowości `GET /v1/health`; brak `password` / kluczy API w pliku

### deploy-002 — Wolumen LibSQL + DuckDB Mastry, bez tokenu Studio w skrypcie

- **Kod:** `deploy/update-container.test.mjs` → `persists Mastra LibSQL on a host volume without embedding secrets`
- **Krytyczność:** high
- **Logika:** Editor i wykresy Studio nie mogą ginąć przy `docker rm`; ścieżki w kontenerze stałe, token Studio zostaje w `--env-file`.
- **Wejście:** treść `deploy/update-container.sh`
- **Wyjście:** host `/opt/evabot/mastra` → `/data`; `MASTRA_STORAGE_URL=file:/data/mastra.db`; `MASTRA_OBSERVABILITY_PATH=/data/observability.duckdb`; brak `MASTRA_STUDIO_TOKEN` w skrypcie

### deploy-003 — Drugi obraz Studio na 4111, bez sekretów w skrypcie

- **Kod:** `deploy/update-container.test.mjs` → `runs Studio as a second image on 4111 without embedding secrets`
- **Krytyczność:** high
- **Logika:** UI Studio nie idzie w obraz API; port 4111 i host-gateway, token tylko z env-file.
- **Wejście:** treść `deploy/update-container.sh`
- **Wyjście:** `Dockerfile.studio`, `evabot-studio:git`, `-p 4111:4111`; brak `MASTRA_STUDIO_TOKEN` w skrypcie
