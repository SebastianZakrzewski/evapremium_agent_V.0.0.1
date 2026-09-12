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
4. `docker run -d --name evabot-api --restart unless-stopped -p 3000:3000 --env-file /opt/evabot/api/.env evabot-api:git`

Env: `DEEPSEEK_API_KEY`, `BITRIX_WEBHOOK_URL`, `SUPABASE_URL`
(`https://kmepxyervpeujwvgdqtm.supabase.co`), `SUPABASE_SERVICE_ROLE_KEY`,
`WIDGET_ORIGIN` (HTTPS origin Vercel, bez slasha), `PORT=3000`,
`SENTRY_DSN` (adres ingest projektu, nie token `sntryu_`).

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

## Smoke

- Auto z szablonem w PROD → wycena z `pricing_matrix` (aktywny katalog).
- Lead: `crm.lead.add` tylko kontakt + zgoda (bramka Nest, nie UI).
