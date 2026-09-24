# Deploy (Slice 7)

Operacje na VPS i Vercel. Sekrety tylko w `api/.env` na serwerze / env Vercel
widgetu (`VITE_API_BASE_URL`). Nie commituj `docs/provider_configuration.json`
(klucze jak w `docs/provider_configuration.example.json`; skrypt
`deploy/hetzner-sync.py` czyta `supabase-service-role-key.url`/`key` oraz SSH
`key_path` i opcjonalne `password`). Token `sentry-api-key` to nie DSN Nest.

## API (Hetzner, Docker z GitHub)

Źródło: [SebastianZakrzewski/evapremium_agent_V.0.0.1](https://github.com/SebastianZakrzewski/evapremium_agent_V.0.0.1).
Sekrety zostają w `/opt/evabot/api/.env` (nie w obrazie).

1. `git clone` repo do `/opt/evabot-src` (gałąź `main`).
2. `docker build -t evabot-api:git /opt/evabot-src`
3. Zatrzymaj stary `systemd evabot-api` (Node na hoście).
4. `docker run` API `:3000` + Studio `:4111` (`deploy/update-container.sh`).

Env: `DEEPSEEK_API_KEY`, `BITRIX_WEBHOOK_URL`, `SUPABASE_URL`
(`https://kmepxyervpeujwvgdqtm.supabase.co`), `SUPABASE_SERVICE_ROLE_KEY`,
`WIDGET_ORIGIN` (HTTPS origin Vercel, bez slasha), `PORT=3000`,
`SENTRY_DSN` (adres ingest projektu, nie token `sntryu_`).
Opcjonalnie RAG FAQ (Nest, nie widget): `OPENAI_API_KEY` (`text-embedding-3-small`).
Bez tego klucza w `/opt/evabot/api/.env` `search-leaves` zwraca pustą listę
(embedder wyłączony). Po zmianie `.env` **odtwórz** kontener API (`deploy/update-container.sh`
albo `deploy/patch-hetzner-openai-and-restart.py`) — samo `docker restart` nie
ładuje nowych zmiennych z `--env-file`.
Indeks `eva_bot.context_node_embeddings` Nest czyta przez Supabase service
role (jak `context_nodes`). `DATABASE_URL` jest tylko do skryptu ingestu,
nie do tury czatu. Migracja
`20260913220000_context_node_embeddings.sql` **nie** apply na PROD bez zgody.
Po apply: `npm run ingest:leaves --workspace api` (wymaga `nest build` /
`dist`; ładuje `eva_bot.context_nodes` gdy jest Supabase env, inaczej
fixture). Bez env skrypt wychodzi ze skip.
Opcjonalnie Studio: `MASTRA_STUDIO_TOKEN` (Bearer + hasło basic `eva`),
`EVA_STUDIO_PUBLIC_HOST` (IP/domena w pasku przeglądarki). HTTP Mastry
`/mastra` zostaje na Neście. LibSQL: host `/opt/evabot/mastra` →
`file:/data/mastra.db`. DuckDB: `MASTRA_OBSERVABILITY_PATH=/data/observability.duckdb`
(ten sam wolumen). UI: `http://46.224.75.64:4111` (login `eva`, hasło =
token). Caddy wstrzykuje Bearer; tunel SSH nie jest potrzebny.

`npm run studio:prod` zostaje do lokalnego UI przeciwko tunelowi.

Proces w kontenerze słucha na `0.0.0.0`. HTTPS (Caddy/nginx + domena) jest
potrzebny, żeby widget z Vercel wołał API bez mixed content (dziś rewrite `/v1`
na Vercel).

Rola PostgREST `authenticator` musi mieć `eva_bot` w `pgrst.db_schemas`
(oprócz `evapremium_shop`).

## CD (GitHub Actions → Hetzner)

Po pushu na `main` (albo `workflow_dispatch`) job `verify` odpala
`npm run verify`, potem SSH przebudowuje obraz:
`deploy/update-container.sh` w `/opt/evabot-src`.

Sekrety repo (GitHub → Settings → Secrets): `HETZNER_HOST`, `HETZNER_USER`,
`HETZNER_SSH_KEY` (klucz prywatny ed25519 tylko do deployu; publiczny w
`authorized_keys` na VPS). Klucz nie jest w gicie. Env API nadal tylko w
`/opt/evabot/api/.env`.

## Widget (Vercel)

- Root: `widget`
- Build: `npm run build`
- Env build-time: `VITE_API_BASE_URL=https://<api-host>` (nie service role)
- Snippet sklepu: `shopEmbedSnippet('https://widget-xi-eight.vercel.app')`
  (alias produkcyjny widgetu Vercel). API: `http://46.224.75.64:3000`
  (rewrite `/v1` na Vercel → ten host). HTTPS API — gdy będzie domena.

## Dashboard operatora (lokalnie; Vercel bez apply)

Pakiet `dashboard/` — **osobny** projekt Vercel (inny origin niż widget).
W tej serii **nie** tworzono projektu Vercel i **nie** ustawiano env na
Hetznerze. Migracja `eva_bot.agent_events` jest w repo; apply PROD tylko
za zgodą.

Lokalny smoke:

1. W `api/.env`: `DASHBOARD_TOKEN` (≠ `MASTRA_STUDIO_TOKEN`),
   `DASHBOARD_ORIGIN=http://localhost:5174`.
2. `npm run start:dev --workspace api`
3. `npm run dev --workspace dashboard` (port 5174, proxy `/v1` → Nest).
   Cel proxy: `DASHBOARD_API_PROXY` w `dashboard/.env` (plik jest w
   `.gitignore`). Puste = `http://127.0.0.1:3000`. Produkcyjny Nest:
   `http://46.224.75.64:3000`. Przeglądarka zostaje na `localhost:5174`,
   więc token nie idzie przez publiczny rewrite jak w widgecie.
4. Wklej token w bramce — `DASHBOARD_TOKEN` tego Nestu, na który wskazuje
   proxy. Przegląd doby, lista sesji, widok sesji.

Gdy będzie zgoda na Vercel: root `dashboard`, build `npm run build`.
Env build: `VITE_API_BASE_URL=https://<api-host>` (publiczny URL Nest, nie
service role). `DASHBOARD_TOKEN` operator wkleja w UI albo trzyma poza
snippetem sklepu. Nest: `DASHBOARD_ORIGIN` = origin projektu Vercel.
`dashboard/vercel.json` **nie** robi rewrite `/v1` na Hetzner (Bearer z
przeglądarki operatora, nie jak widget).

## Smoke

- Auto z szablonem w PROD → wycena z `pricing_matrix` (aktywny katalog).
- Lead: `crm.lead.add` tylko kontakt + zgoda (bramka Nest, nie UI).
