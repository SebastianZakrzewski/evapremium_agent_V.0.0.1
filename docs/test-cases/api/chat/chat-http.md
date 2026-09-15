# Kontrakt HTTP czatu

Kod: `tests/api/chat/chat.contract.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: widget woła Nest (`POST /v1/sessions`, wiadomość SSE —
kontroler w procesie; Jest nie bootuje Nest 12 ESM, TD-003). Stub agenta
(DeepSeek poza testem, TD-005) woła narzędzia, które idą w serwisy Slice 1–3.
CORS origin sklepu + `WIDGET_ORIGIN`. Sesje: in-memory w teście; PROD przy
env Supabase. Bez Bitrix w tym zestawie.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| chat-001 | critical | Sesja + wycena z narzędzia Nest |
| chat-002 | critical | Kaskada przez narzędzie |
| chat-003 | critical | Liść i miss bez zmyślonego body |
| chat-004 | high | Nieznana sesja → 404 |
| chat-005 | medium | CORS origin sklepu |
| chat-006 | high | Zapis user/assistant na sesji |
| chat-007 | high | SSE: klatka `delta` |
| chat-008 | high | SSE: tokeny, potem `done` |
| chat-010 | medium | SSE przekazuje sessionId do agenta |
| chat-009 | low | Health probe CD |

### chat-001 — Sesja + wycena z narzędzia Nest

- **Kod:** `tests/api/chat/chat.contract.spec.ts` → `it('creates a session then quotes via Nest pricing tool')`
- **Krytyczność:** critical
- **Logika:** kwota pochodzi z `quotePrice` / macierzy, nie z modelu.
- **Wejście:** `sessions.create()`, potem `postChatMessage` z `quote passenger_car komplet-5szt` (stub, bez `DEEPSEEK_API_KEY`; HTTP w `ChatController`)
- **Wyjście:** `{ text: 'quoted', data: { amount: 599, currency: 'PLN' } }`

### chat-002 — Kaskada przez narzędzie

- **Kod:** `tests/api/chat/chat.contract.spec.ts` → `it('resolves a template through the cascade tool')`
- **Krytyczność:** critical
- **Logika:** LLM nie wybiera id szablonu; narzędzie woła `TemplateCascadeService`.
- **Wejście:** `resolve vw golf 8 kombi 2021`
- **Wyjście:** `data.status: 'one'`, `template.id: 'tmpl-golf-mk8-wagon'`

### chat-003 — Liść i miss bez zmyślonego body

- **Kod:** `tests/api/chat/chat.contract.spec.ts` → `it('returns a context leaf and miss without invented copy')`
- **Krytyczność:** critical
- **Logika:** fakt tylko z liścia; miss nie ma `body`.
- **Wejście:** `leaf dostawa`, `leaf pielegnacja`
- **Wyjście:** hit z treścią dostawy; `{ status: 'miss' }`

### chat-004 — Nieznana sesja → 404

- **Kod:** `tests/api/chat/chat.contract.spec.ts` → `it('rejects an unknown session')`
- **Krytyczność:** high
- **Logika:** wiadomość wymaga wcześniej utworzonej sesji (kontrakt; persistencja to Slice 5).
- **Wejście:** `sessionId: 'missing'`
- **Wyjście:** `UnknownSessionError` (HTTP 404 w `ChatService`)

### chat-005 — CORS origin sklepu

- **Kod:** `tests/api/chat/chat.contract.spec.ts` → `it('allows only shop CORS origins')`
- **Krytyczność:** medium
- **Logika:** przeglądarka sklepu może wołać API; lista originów jak w `SECURITY.md` (wiring `configureChatHttp` w `main`, bez bootu Nest — TD-003).
- **Wejście:** `SHOP_CORS_ORIGINS`
- **Wyjście:** `https://evapremium.pl`, `https://www.evapremium.pl`

### chat-006 — Zapis user/assistant na sesji

- **Kod:** `tests/api/chat/chat.contract.spec.ts` → `it('persists user and assistant messages on the session')`
- **Krytyczność:** high
- **Logika:** transkrypt zostaje przy sesji (in-memory / przyszły `eva_bot`); nie idzie do Bitrix.
- **Wejście:** `session-persist` + `quote passenger_car komplet-5szt`
- **Wyjście:** dwa rekordy `user` / `assistant` (`quoted`)

### chat-007 — SSE: klatka `delta`

- **Kod:** `tests/api/chat/sse.spec.ts` → `it('encodes a text delta frame for the widget stream')`
- **Krytyczność:** high
- **Logika:** widget czyta tokeny modelu z `event: delta`, nie z jednego JSON-a.
- **Wejście:** `{ event: 'delta', data: { text: 'Komplet' } }`
- **Wyjście:** `event: delta\ndata: {"text":"Komplet"}\n\n`

### chat-008 — SSE: tokeny, potem `done`

- **Kod:** `tests/api/chat/stream-chat-message.spec.ts` → `it('emits token deltas then done for a streaming agent')`
- **Krytyczność:** high
- **Logika:** transkrypt assistant to złożony tekst; `data.status` przy `stream()` to `generated`.
- **Wejście:** agent `stream()` → `a`, `b`; wiadomość `golf 8 komplet`
- **Wyjście:** dwie klatki `delta`, `done` z `text: 'ab'`; sesja user+assistant

### chat-010 — SSE przekazuje sessionId do agenta

- **Kod:** `tests/api/chat/stream-chat-message.spec.ts` → `it('passes sessionId into the streaming agent')`
- **Krytyczność:** medium
- **Logika:** pamięć intencji wymaga `sessionId` przy `stream`; ramki SSE bez zmiany.
- **Wejście:** sesja `session-intent`, wiadomość `kolejna wiadomosc`
- **Wyjście:** agent dostał `session-intent`

### chat-009 — Health probe CD

- **Kod:** `tests/api/chat/api-health.spec.ts` → `it('returns ok with the current CD probe token')`
- **Krytyczność:** low
- **Logika:** `GET /v1/health` zwraca stały token, żeby sprawdzić, czy nowy obraz jest na VPS.
- **Wejście:** `apiHealth()`
- **Wyjście:** `{ status: 'ok', probe: 'cd-probe-wait-ready' }`

Powitanie i chipy: [session-opener.md](session-opener.md) (`opener-001`, `opener-002`).
