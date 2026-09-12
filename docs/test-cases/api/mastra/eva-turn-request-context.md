# Request context tury EVA

Kod: `api/src/mastra/eva-turn-request-context.spec.ts`

Logika zestawu: zaakceptowany `ShopIntent` idzie w Mastra `RequestContext`
(`intent`). Z niego składany jest system prompt i mapa tooli — bez nowej
instancji `Agent`. Brak klucza = `out_of_scope`.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| ctx-001 | high | intent w request context |
| ctx-002 | high | brak intent → out_of_scope |
| ctx-003 | critical | pricing: instructions + quote-price |
| ctx-004 | critical | product_info bez quote-price |

### ctx-001 — intent w request context

- **Kod:** `api/src/mastra/eva-turn-request-context.spec.ts` → `it('stores ShopIntent for interpolation and display conditions')`
- **Krytyczność:** high
- **Logika:** Studio i Nest czytają ten sam klucz `intent` (prompt-block `{{intent}}`).
- **Wejście:** `createEvaTurnRequestContext('pricing')`
- **Wyjście:** `get('intent') === 'pricing'`

### ctx-002 — brak intent → out_of_scope

- **Kod:** `api/src/mastra/eva-turn-request-context.spec.ts` → `it('defaults missing intent to out_of_scope')`
- **Krytyczność:** high
- **Logika:** Playground bez JSON context nie dostaje pełnego katalogu tooli.
- **Wejście:** pusty `RequestContext`
- **Wyjście:** `shopIntentFromContext` → `out_of_scope`

### ctx-003 — pricing: instructions + quote-price

- **Kod:** `api/src/mastra/eva-turn-request-context.spec.ts` → `it('resolves pricing instructions and quote-price from request context')`
- **Krytyczność:** critical
- **Logika:** System prompt tury = `assembleTurnInstructions(pricing)`; tool `quote-price` jest na mapie.
- **Wejście:** context `intent: pricing`, katalog 3 tooli
- **Wyjście:** instructions identyczne ze złożeniem profilu; klucze `quote-price`, `resolve-template`

### ctx-004 — product_info bez quote-price

- **Kod:** `api/src/mastra/eva-turn-request-context.spec.ts` → `it('does not expose quote-price for product_info request context')`
- **Krytyczność:** critical
- **Logika:** Kwota nie może być wywołana na Q&A — tool nie ma w mapie z contextu.
- **Wejście:** `intent: product_info`
- **Wyjście:** brak `quote-price`; są `resolve-template` i `lookup-leaf`
