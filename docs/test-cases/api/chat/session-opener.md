# Powitanie sesji czatu

Kod: `tests/api/chat/session-opener.spec.ts`

Logika zestawu: `POST /v1/sessions` zapisuje stałe powitanie asystenta
(bez LLM) i zwraca pięć chipów z gotową wiadomością użytkownika.
Klik w widgecie to zwykła wiadomość; kwalifikator mapuje ją na `ShopIntent`.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| opener-001 | high | Sesja + transkrypt powitania + 5 chipów |
| opener-002 | high | Treść chipa → intent sklepu, nie OOS |

### opener-001 — Sesja + transkrypt powitania + 5 chipów

- **Kod:** `tests/api/chat/session-opener.spec.ts` → `it('persists a deterministic greeting and returns five shop chips')`
- **Krytyczność:** high
- **Logika:** otwarcie sesji nie woła agenta; pierwsza linia asystenta jest stała.
- **Wejście:** `persistOpenedChatSession(InMemoryChatSessions)`
- **Wyjście:** `greeting` + 5 `suggestions`; `listMessages` = jedna linia `assistant`

### opener-002 — Treść chipa → intent sklepu

- **Kod:** `tests/api/chat/session-opener.spec.ts` → `it('maps each chip message to a shop intent without out_of_scope')`
- **Krytyczność:** high
- **Logika:** stub kwalifikatora (verify bez DeepSeek) rozpoznaje kanoniczne teksty chipów.
- **Wejście:** pięć `SESSION_OPENER_SUGGESTIONS[].message`
- **Wyjście:** `product_info`, `pricing`, `product_info`, `delivery`, `after_sales`
