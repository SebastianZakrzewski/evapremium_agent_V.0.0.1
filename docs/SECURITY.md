# SECURITY.md

Aktualizuj przy zmianie originów, sekretów, PII lub integracji.

## Sekrety

Klucze DeepSeek, Supabase (service), Bitrix — tylko na serwerze (Nest na
Hetznerze). Nigdy w widgecie ani w snippecie.

## Publiczne API czatu (MVP)

- CORS: tylko `https://evapremium.pl` i `https://www.evapremium.pl`.
- W snippecie: **publiczny** identyfikator widgetu, nie sekret.
- To ogranicza obce strony w przeglądarce; nie jest to silne uwierzytelnienie.
- Brak logowania klienta w MVP.

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
