# Rejestr IntentProfile

Kod: `api/src/mastra/intents/intent-profile.spec.ts`

Logika zestawu: `intentProfileFor` zwraca wypełniony profil znanej intencji;
narzędzia ⊆ id Nest (`resolve-template`, `quote-price`, `lookup-leaf`);
nieznany klucz → `undefined`.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| intent-001 | high | product_info: context + tool-e fit/FAQ, bez quote-price |
| intent-002 | high | Nieznany intent → undefined |
| intent-003 | medium | Wszystkie ShopIntent wypełnione; out_of_scope bez tooli |

### intent-001 — product_info: context + tool-e fit/FAQ, bez quote-price

- **Kod:** `api/src/mastra/intents/intent-profile.spec.ts` → `it('returns product_info with context and allowed shop tools')`
- **Krytyczność:** high
- **Logika:** Gałąź produktu ma kaskadę i liść, nie macierz cen — kwota nie wycieka na Q&A.
- **Wejście:** `'product_info'`
- **Wyjście:** profil `id=product_info`, niepusty `context`, `tools` = `resolve-template` + `lookup-leaf`, bez `quote-price`

### intent-002 — Nieznany intent → undefined

- **Kod:** `api/src/mastra/intents/intent-profile.spec.ts` → `it('returns undefined for an unknown intent')`
- **Krytyczność:** high
- **Logika:** Brak profilu nie otwiera agenta ze wszystkimi toolami (`general_agent` zakazany).
- **Wejście:** `'not_an_intent'`
- **Wyjście:** `undefined`

### intent-003 — Wszystkie ShopIntent wypełnione; out_of_scope bez tooli

- **Kod:** `api/src/mastra/intents/intent-profile.spec.ts` → `it('fills every known ShopIntent with allowed tools only')`
- **Krytyczność:** medium
- **Logika:** Stuby z `!` są zakazane; każda znana intencja ma kontrakt; tool-e tylko z rejestru Nest.
- **Wejście:** `product_info`, `pricing`, `delivery`, `after_sales`, `out_of_scope`
- **Wyjście:** każdy profil z `id`, `context`, `agent_loop`; `out_of_scope.tools=[]`; `pricing` zawiera `resolve-template` i `quote-price`
