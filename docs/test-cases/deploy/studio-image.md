# Obraz Docker Mastra Studio

Kod: `deploy/studio.test.mjs`  
Standard: [docs/test-cases/README.md](../README.md)

Logika zestawu: UI Studio jest osobnym kontenerem. Przeglądarka woła ten sam
origin (`:4111`); Caddy dokłada Bearer i proxy `/mastra` na Nest.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| studio-image-001 | high | Caddy: `/mastra` → host API + Bearer z env |
| studio-image-002 | high | `mastra studio` na 4112, publiczny host:4111 |
| studio-image-003 | medium | Pin CLI Mastry i presety intencji |

### studio-image-001 — Caddy: `/mastra` → host API + Bearer z env

- **Kod:** `deploy/studio.test.mjs` → `Studio Caddy same-origin proxies /mastra to host API with injected Bearer`
- **Krytyczność:** high
- **Logika:** Browser nie widzi sieci Dockera; `/mastra` musi iść na `host.docker.internal:3000` z tokenem z env, nie z gita.
- **Wejście:** `deploy/studio/Caddyfile`
- **Wyjście:** `handle /mastra*`, `host.docker.internal:3000`, `{$MASTRA_STUDIO_TOKEN}`, `basic_auth`, proxy UI `127.0.0.1:4112`

### studio-image-002 — `mastra studio` na 4112, publiczny host:4111

- **Kod:** `deploy/studio.test.mjs` → `Studio start binds UI internally and tells the browser public host:4111`
- **Krytyczność:** high
- **Logika:** `--server-host` to adres w pasku przeglądarki, nie hostname kontenera.
- **Wejście:** `deploy/studio/start.sh`
- **Wyjście:** `--port 4112`, `--server-api-prefix /mastra`, Caddy z `/tmp/Caddyfile`; brak hardcoded IP

### studio-image-003 — Pin CLI Mastry i presety intencji

- **Kod:** `deploy/studio.test.mjs` → `Studio image pins Mastra CLI and copies presets`
- **Krytyczność:** medium
- **Logika:** obraz nie woła `mastra@latest` przy starcie.
- **Wejście:** `Dockerfile.studio`
- **Wyjście:** `mastra@1.29.0`, kopia `mastra-request-context-presets.json`, `EXPOSE 4111`
