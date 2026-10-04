# Plan: budżet tur sesji czatu (TDD)

Status: zaimplementowane w kodzie (slice 1–4). Apply migracji na PROD
zostaje osobnym krokiem operacyjnym.

Cel: publiczny czat przestaje wołać model po przekroczeniu budżetu.
Jedna sesja ma 25 wiadomości użytkownika. Ten sam gość (skrót IP) ma
40 wiadomości i 10 nowych sesji na godzinę UTC. Rezerwacja jest w Neście,
zanim powstanie wiersz wiadomości i zanim ruszy agent.

Granice: `ARCHITECTURE.md`, `docs/SECURITY.md`.
Pętla: `.cursor/rules/slice-loop.mdc`.
Apply migracji PROD tylko za zgodą.

## Kontrakt

Liczy się wiadomość użytkownika przyjęta do modelu. Powitanie z
`persistOpenedChatSession` się nie liczy. `maxToolCalls` zostaje limitem
pętli narzędzi w jednej turze.

| Budżet | Próg | Okno | Zmienna |
| --- | --- | --- | --- |
| Wiadomości sesji | 25 | życie sesji | `CHAT_SESSION_TURN_LIMIT` |
| Wiadomości gościa | 40 | godzina UTC | `CHAT_IP_TURN_LIMIT` |
| Nowe sesje gościa | 10 | godzina UTC | `CHAT_IP_SESSION_LIMIT` |

Brak zmiennej = próg z tabeli. `0` i wartość ujemna są odrzucane przy
starcie procesu (fail closed).

Gość to SHA-256 z adresu IP i soli `CHAT_BUDGET_IP_SALT`. Surowe IP nie
wchodzi do bazy, logu ani odpowiedzi. Adres bierze `req.ip` przy
`trust proxy` = 1 (hop Caddy). Kontroler nie czyta `X-Forwarded-For`.

Gdy jest `DATA_STORE`, pusta sól blokuje start. Testy in-memory bez store
dostają sól w fabryce testu.

Rezerwacja jest atomowa: jeden `UPDATE … WHERE count < limit RETURNING`
(albo równoważny krok w pamięci pod jedną kolejką). Dwa równoległe żądania
na ostatniej jednostce: jedno przechodzi. Jednostka schodzi w momencie
przyjęcia. Brak zwrotu przy błędzie modelu.

Kolejność `POST /v1/sessions/:sessionId/messages`:

1. puste `message` → 400, bez rezerwacji,
2. nieznana sesja → 404, bez rezerwacji,
3. brak budżetu sesji albo gościa → 429, bez `appendMessage` i bez agenta,
4. dopiero potem zapis user i stream.

Odpowiedź 429 jest JSON-em, zanim `flushHeaders` otworzy SSE:

```json
{ "error": "turn_budget_exceeded" }
```

`POST /v1/sessions` przy braku budżetu sesji gościa zwraca 429 z tym samym
ciałem i nie tworzy wiersza `chat_sessions`.

Widget przy 429 wstawia stały tekst asystenta, wyłącza pole i chipy na
resztę życia panelu i nie ponawia żądania:

`W tej rozmowie wykorzystano limit zapytań. Napisz do nas przez formularz sklepu.`

Inny błąd sieci zostaje przy dotychczasowym tekście
`Nie udało się dokończyć tej odpowiedzi.`

## Poza tym planem

Konto użytkownika, cookie odwiedzającego, płatny plan, zwrot jednostki po
błędzie modelu, limit tokenów, zmiana `maxToolCalls`, panel zużycia w
dashboardzie, apply migracji na PROD.

## Slice 1 — księga w pamięci

Testy: `tests/api/chat/session-turn-budget.spec.ts`.
Wpis: `docs/test-cases/api/chat/session-turn-budget.md`.

- 25. wiadomość sesji przechodzi, 26. zwraca `turn_budget_exceeded` i nie zwiększa licznika.
- Powitanie asystenta nie zwiększa licznika sesji.
- 40. wiadomość gościa w tej samej godzinie UTC przechodzi, 41. jest odmową; nowa godzina zeruje kubełek wiadomości, nie licznik sesji.
- 10. `POST` sesji gościa przechodzi, 11. jest odmową bez tworzenia sesji w księdze.
- Dwie równoległe rezerwacje przy stanie 24: jedna przyjęta, licznik = 25.
- Puste IP albo pusta sól → odmowa, bez zapisu skrótu.

Kod: `api/src/chat/session-turn-budget.ts` (`ChatTurnBudget`,
`InMemoryChatTurnBudget`, progi, skrót). Bez Nest, bez HTTP, bez SQL.

## Slice 2 — bramka HTTP

Testy w `tests/api/chat/chat.contract.spec.ts` i
`tests/api/chat/stream-chat-message.spec.ts`.
Wpisy w `docs/test-cases/api/chat/chat-http.md`.

- Wiadomość w budżecie woła agenta jak dziś.
- 26. wiadomość: brak wywołania agenta, brak nowej wiadomości user w transkrypcie, wynik `turn_budget_exceeded`.
- Nieznana sesja nadal 404 i nie tyka księgi.
- Puste `message` nadal 400 i nie tyka księgi.
- 11. utworzenie sesji z tego samego gościa: brak `sessions.create()`.

Kod: `ChatService` rezerwuje przed `streamChatMessage` / `postChatMessage`.
`ChatController` mapuje odmowę na 429 JSON przed `flushHeaders`.
`ChatModule` wstrzykuje `InMemoryChatTurnBudget`.
`configureChatHttp` ustawia `trust proxy` na 1.
Dopisek w `docs/SECURITY.md` i krótka wzmianka przy CORS w `ARCHITECTURE.md`.

Pliki spoza slice’a: migracja, adapter Supabase, widget.

## Slice 3 — księga w Supabase

Test: ten sam port co slice 1, na adapterze ze stubem `DataStore`
(`tests/api/chat/supabase-session-turn-budget.spec.ts`).
Wpis obok slice 1.

Migracja `supabase/migrations/*_session_turn_budget.sql` (bez apply PROD):

- `eva_bot.chat_sessions.user_turns integer not null default 0`,
- `eva_bot.usage_buckets (subject_kind, subject_hash, window_start, count)` z kluczem unikalnym i `count >= 0`.

`subject_kind` to `ip_turn` albo `ip_session`. `window_start` to początek
godziny UTC. W `usage_buckets` jest skrót, nie adres.

`ChatModule`: store obecny → adapter Supabase i wymagana sól; brak store →
księga z slice 2.

## Slice 4 — widget

Test: `tests/widget/chat/ChatPanel.test.tsx`.
Wpis: `docs/test-cases/widget/chat-ui.md`.

- `postMessage` rzuca błąd budżetu → tekst limitu, pole i chipy wyłączone, drugie wysłanie nie woła API.
- Inny błąd → dotychczasowy tekst, pole wraca do edycji.

Kod: `http-chat-api.ts` rozpoznaje 429 i `turn_budget_exceeded`.
`ChatPanel` trzyma stan wyczerpania budżetu do odmontowania.
