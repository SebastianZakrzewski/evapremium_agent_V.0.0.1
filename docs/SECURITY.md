# SECURITY.md

Aktualizuj przy zmianie originów, sekretów, PII lub integracji.

## Sekrety

Klucze DeepSeek, Supabase (service), Bitrix oraz `SENTRY_DSN` — tylko na
serwerze (Nest na Hetznerze). Nigdy w widgecie ani w snippecie.
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
Dostęp do produkcji: tunel SSH na `127.0.0.1:3000`, nie otwierać `/mastra`
w Caddy bez auth. Token tylko w `/opt/evabot/api/.env`.

## Dane

Sesje: `eva_bot` w PROD. Katalog/cennik: `evapremium_shop`. Nest: klucz
service, nie anon z widgetu.

Tekst klauzuli i informacji o czacie: liście `zgoda-lead` i `chat-zapis` w
`eva_bot.context_nodes`, nie prompt.

## Ryzyko (nie naprawiane w tej zmianie)

Projekt PROD trzyma też **n8n** w `public` (credentials, execution_data, …).
Wiele tabel **bez RLS**, w tym `eva_bot.leads`, `evapremium_shop.payments` i
tabele n8n. Anon key nie może trafić do widge agenta. Włączenie RLS na n8n
bez polityk zepsuje n8n — osobna decyzja, nie auto-fix.
