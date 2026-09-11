# Kontrakt HTTP czatu

Kod: `api/src/chat/chat.contract.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: widget woła Nest (`POST /v1/sessions`, wiadomość — kontroler
w procesie; Jest nie bootuje Nest 12 ESM, TD-003). Stub agenta (DeepSeek poza
testem, TD-005) woła narzędzia, które idą w serwisy Slice 1–3. CORS origin
sklepu. Sesje in-memory (TD-004). Bez Bitrix i bez zapisu w Supabase.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| chat-001 | critical | Sesja + wycena z narzędzia Nest |
| chat-002 | critical | Kaskada przez narzędzie |
| chat-003 | critical | Liść i miss bez zmyślonego body |
| chat-004 | high | Nieznana sesja → 404 |
| chat-005 | medium | CORS origin sklepu |

### chat-001 — Sesja + wycena z narzędzia Nest

- **Kod:** `api/src/chat/chat.contract.spec.ts` → `it('creates a session then quotes via Nest pricing tool')`
- **Krytyczność:** critical
- **Logika:** kwota pochodzi z `quotePrice` / macierzy, nie z modelu.
- **Wejście:** `sessions.create()`, potem `postChatMessage` z `quote passenger_car komplet-5szt` (stub, bez `DEEPSEEK_API_KEY`; HTTP w `ChatController`)
- **Wyjście:** `{ text: 'quoted', data: { amount: 599, currency: 'PLN' } }`

### chat-002 — Kaskada przez narzędzie

- **Kod:** `api/src/chat/chat.contract.spec.ts` → `it('resolves a template through the cascade tool')`
- **Krytyczność:** critical
- **Logika:** LLM nie wybiera id szablonu; narzędzie woła `TemplateCascadeService`.
- **Wejście:** `resolve vw golf 8 kombi 2021`
- **Wyjście:** `data.status: 'one'`, `template.id: 'tmpl-golf-mk8-wagon'`

### chat-003 — Liść i miss bez zmyślonego body

- **Kod:** `api/src/chat/chat.contract.spec.ts` → `it('returns a context leaf and miss without invented copy')`
- **Krytyczność:** critical
- **Logika:** fakt tylko z liścia; miss nie ma `body`.
- **Wejście:** `leaf dostawa`, `leaf pielegnacja`
- **Wyjście:** hit z treścią dostawy; `{ status: 'miss' }`

### chat-004 — Nieznana sesja → 404

- **Kod:** `api/src/chat/chat.contract.spec.ts` → `it('rejects an unknown session')`
- **Krytyczność:** high
- **Logika:** wiadomość wymaga wcześniej utworzonej sesji (kontrakt; persistencja to Slice 5).
- **Wejście:** `sessionId: 'missing'`
- **Wyjście:** `UnknownSessionError` (HTTP 404 w `ChatService`)

### chat-005 — CORS origin sklepu

- **Kod:** `api/src/chat/chat.contract.spec.ts` → `it('allows only shop CORS origins')`
- **Krytyczność:** medium
- **Logika:** przeglądarka sklepu może wołać API; lista originów jak w `SECURITY.md` (wiring `configureChatHttp` w `main`, bez bootu Nest — TD-003).
- **Wejście:** `SHOP_CORS_ORIGINS`
- **Wyjście:** `https://evapremium.pl`, `https://www.evapremium.pl`
