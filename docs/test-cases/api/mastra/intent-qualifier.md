# Kwalifikator intencji

Kod: `tests/api/mastra/intents/intent-qualifier.spec.ts`

Logika zestawu: wiadomość → `ShopIntent` ze schematu Zod; stub bez DeepSeek;
adapter Mastry parsuje structured output; krok `executeQualifyStep` bez shop-tooli.
Czat / SSE nietknięte (Slice 3).

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| qualify-001 | high | Pytanie o cenę → pricing |
| qualify-002 | medium | Dopasowanie auta → product_info |
| qualify-003 | high | Poza ofertą → out_of_scope |
| qualify-004 | high | Structured output delivery ze schematu |
| qualify-005 | high | general_agent odrzucony przez schemat |
| qualify-006 | high | Mapa tooli kwalifikatora pusta |
| qualify-007 | high | Krok workflow zwraca ShopIntent (stub, bez klucza) |
| qualify-008 | medium | Powitanie → product_info |

### qualify-001 — Pytanie o cenę → pricing

- **Kod:** `tests/api/mastra/intents/intent-qualifier.spec.ts` → `it('maps a price question to pricing ShopIntent')`
- **Krytyczność:** high
- **Logika:** Stub (verify bez `DEEPSEEK_API_KEY`) mapuje wycenę na `pricing`, wynik przechodzi `qualifyResultSchema`.
- **Wejście:** `Ile kosztują dywaniki do Golfa 8?`
- **Wyjście:** `{ intent: 'pricing', confidence: 1 }`

### qualify-002 — Dopasowanie auta → product_info

- **Kod:** `tests/api/mastra/intents/intent-qualifier.spec.ts` → `it('maps a fit question to product_info')`
- **Krytyczność:** medium
- **Logika:** Fit / katalog to `product_info`, nie wycena.
- **Wejście:** `Czy dywaniki pasują do Golfa 8?`
- **Wyjście:** `intent: product_info`

### qualify-003 — Poza ofertą → out_of_scope

- **Kod:** `tests/api/mastra/intents/intent-qualifier.spec.ts` → `it('maps unknown copy to out_of_scope')`
- **Krytyczność:** high
- **Logika:** Brak ścieżki sklepu → `out_of_scope`, nie `general_agent`.
- **Wejście:** `jaki jest kurs euro`
- **Wyjście:** `intent: out_of_scope`

### qualify-004 — Structured output delivery ze schematu

- **Kod:** `tests/api/mastra/intents/intent-qualifier.spec.ts` → `it('parses structured generate output through qualifyResultSchema')`
- **Krytyczność:** high
- **Logika:** Adapter Mastry czyta `object` z `generate` + Zod; bez wołania sieci.
- **Wejście:** fake `generate` → `{ intent: 'delivery', confidence: 0.9 }`
- **Wyjście:** ten sam `QualifyResult`

### qualify-005 — general_agent odrzucony przez schemat

- **Kod:** `tests/api/mastra/intents/intent-qualifier.spec.ts` → `it('rejects generate output that is not a ShopIntent')`
- **Krytyczność:** high
- **Logika:** LLM nie może zwrócić catch-all agenta ze wszystkimi toolami.
- **Wejście:** `{ intent: 'general_agent', confidence: 1 }`
- **Wyjście:** rzut Zod

### qualify-006 — Mapa tooli kwalifikatora pusta

- **Kod:** `tests/api/mastra/intents/intent-qualifier.spec.ts` → `it('exposes an empty shop-tool map')`
- **Krytyczność:** high
- **Logika:** Kwalifikator nie ma `resolve-template` / `quote-price` / `lookup-leaf`.
- **Wejście:** `QUALIFIER_AGENT_TOOLS`
- **Wyjście:** `{}`

### qualify-007 — Krok workflow zwraca ShopIntent (stub, bez klucza)

- **Kod:** `tests/api/mastra/intents/intent-qualifier.spec.ts` → `it('returns ShopIntent from the qualifier without calling shop tools')`
- **Krytyczność:** high
- **Logika:** `executeQualifyStep` to krok qualify; Jest nie bootuje Mastra ESM (`TD-003` analog).
- **Wejście:** stub + `Ile kosztują dywaniki do Golfa 8?`
- **Wyjście:** `{ intent: 'pricing', confidence: 1 }`

### qualify-008 — Powitanie → product_info

- **Kod:** `tests/api/mastra/intents/intent-qualifier.spec.ts` → `it('maps a greeting to product_info')`
- **Krytyczność:** medium
- **Logika:** samo „Dzień dobry” jest wejściem do sklepu, nie `out_of_scope`.
- **Wejście:** `Dzień dobry`
- **Wyjście:** `intent: product_info`
