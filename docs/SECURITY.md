# SECURITY.md

Aktualizuj przy zmianie originów, sekretów, PII lub integracji.

## Sekrety

Klucze DeepSeek, OpenAI (`OPENAI_API_KEY` — embedding `text-embedding-3-small`
w Nest, nie w widgecie), Supabase (service), `DATABASE_URL` (pgvector,
tylko API), Bitrix, `SENTRY_DSN` oraz
`DASHBOARD_TOKEN` — nie w widgecie ani w snippecie.
`DASHBOARD_TOKEN` ≠ `MASTRA_STUDIO_TOKEN`. Nest trzyma token do weryfikacji
odczytu; projekt Vercel dashboardu może trzymać ten sam sekret w env
(operator), nigdy w publicznym czacie.
Lokalna lista sekretów: `docs/provider_configuration.json` (gitignore);
szablon: `docs/provider_configuration.example.json`.
CD: `HETZNER_SSH_KEY` tylko w GitHub Actions secrets; na VPS wyłącznie
publiczny odpowiednik w `authorized_keys`. Nie commituj klucza prywatnego.

## Publiczne API czatu (MVP)

- CORS: `https://evapremium.pl`, `https://www.evapremium.pl` oraz
  `WIDGET_ORIGIN` (HTTPS origin widgetu na Vercel/CDN).
- W snippecie: **publiczny** identyfikator widgetu, nie sekret.
- To ogranicza obce strony w przeglądarce; nie jest to silne uwierzytelnienie.
- Transkrypt czatu: nie logować treści wiadomości. Tura intencji: `sessionId`,
  current/candidate/accepted, tool-e (`[intent-turn]` na stdout).

## Mastra Studio (HTTP `/mastra`)

Nie jest to publiczny czat. Montaż tylko gdy `DEEPSEEK_API_KEY` **i**
`MASTRA_STUDIO_TOKEN`. Auth: nagłówek `Authorization: Bearer <token>`
(SimpleAuth). Bez `?apiKey=` w query. CORS: `localhost` / `127.0.0.1` porty
4111 i 3000; opcjonalnie `MASTRA_STUDIO_ORIGIN` (HTTPS albo localhost).
UI Studio na VPS: port **4111**, HTTP basic (`eva` / `MASTRA_STUDIO_TOKEN`);
Caddy dokłada Bearer do `/mastra`. Ruch jest HTTP do czasu TLS. Nie wystawiać
`/mastra` w Caddy sklepu bez auth. Token tylko w `/opt/evabot/api/.env`. Plik LibSQL Mastry
na hoście (`/opt/evabot/mastra`), nie w obrazie Dockera. DuckDB observability
ten sam katalog (`observability.duckdb`); może zawierać ślady tur — wolumen
nie jest publiczny.

## Dashboard operatora (HTTP odczytu)

Odczyt transkryptu i eventów: `GET /v1/dashboard/*` na Neście. HTTPS origin
dashboardu (`DASHBOARD_ORIGIN`; localhost HTTP tylko lokalnie) + nagłówek
`Authorization: Bearer` z `DASHBOARD_TOKEN`. CORS tych tras: wyłącznie
`DASHBOARD_ORIGIN`, nie originy sklepu i nie Studio. Brak tokenu lub token
równy `MASTRA_STUDIO_TOKEN` → 401. Treści wiadomości nie logować (jak czat
publiczny). Widget nie woła tych tras. Sekret wpisuje operator w UI (albo
później env projektu Vercel dashboardu) — nie snippet sklepu i nie
`MASTRA_STUDIO_TOKEN`. `VITE_API_BASE_URL` to publiczny URL Nest, nie sekret.
`dashboard/vercel.json` nie proxy’uje `/v1` na Hetzner.
`GET /v1/dashboard/context-graph` zwraca slug, tytuł i pozycję 2D, nie wektor
embeddingu i nie `body` liścia. `context-activity` zwraca tylko zdarzenia
drzewa (`context_search`, `context_hit`, `context_miss`), bez transkryptu.

## Dane

Sesje: `eva_bot` w PROD. Katalog/cennik: `evapremium_shop`. Indeks wektorów
FAQ: `eva_bot.context_node_embeddings` (pomocniczy; fakt = `context_nodes`).
Nest: klucz service / `DATABASE_URL`, nie anon z widgetu.

Tekst klauzuli i informacji o czacie: liście `zgoda-lead` i `chat-zapis` w
`eva_bot.context_nodes`, nie prompt.

## Ryzyko (nie naprawiane w tej zmianie)

Projekt PROD trzyma też **n8n** w `public` (credentials, execution_data, …).
Wiele tabel **bez RLS**, w tym `eva_bot.leads`, `evapremium_shop.payments` i
tabele n8n. Anon key nie może trafić do widge agenta. Włączenie RLS na n8n
bez polityk zepsuje n8n — osobna decyzja, nie auto-fix.
