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
| ctx-005 | high | opublikowane prompt-blocks zastępują prompt profilu |
| ctx-006 | high | czat bez intent → zero shop-tooli |
| ctx-007 | high | Studio bez presetu → pełny katalog |
| ctx-008 | high | Studio z presetem intent → filtr profilu |

### ctx-001 — intent w request context

- **Kod:** `api/src/mastra/eva-turn-request-context.spec.ts` → `it('stores ShopIntent for interpolation and display conditions')`
- **Krytyczność:** high
- **Logika:** Studio i Nest czytają ten sam klucz `intent` (prompt-block `{{intent}}`).
- **Wejście:** `createEvaTurnRequestContext('pricing')`
- **Wyjście:** `get('intent') === 'pricing'`

### ctx-002 — brak intent → out_of_scope

- **Kod:** `api/src/mastra/eva-turn-request-context.spec.ts` → `it('defaults missing intent to out_of_scope')`
- **Krytyczność:** high
- **Logika:** `shopIntentFromContext` bez klucza = `out_of_scope`; mapa tooli w czacie produkcyjnym zostaje pusta (ctx-006).
- **Wejście:** pusty `RequestContext`
- **Wyjście:** `shopIntentFromContext` → `out_of_scope`

### ctx-003 — pricing: instructions + quote-price

- **Kod:** `api/src/mastra/eva-turn-request-context.spec.ts` → `it('resolves pricing instructions and quote-price from request context')`
- **Krytyczność:** critical
- **Logika:** Bez Editora system prompt tury = `assembleTurnInstructions(pricing)`; tool `quote-price` jest na mapie.
- **Wejście:** context `intent: pricing`, katalog 3 tooli
- **Wyjście:** instructions identyczne ze złożeniem profilu; klucze `quote-price`, `resolve-template`

### ctx-004 — product_info bez quote-price

- **Kod:** `api/src/mastra/eva-turn-request-context.spec.ts` → `it('does not expose quote-price for product_info request context')`
- **Krytyczność:** critical
- **Logika:** Kwota nie może być wywołana na Q&A — tool nie ma w mapie z contextu.
- **Wejście:** `intent: product_info`
- **Wyjście:** brak `quote-price`; są `resolve-template`, `lookup-leaf` i `search-leaves`

### ctx-005 — opublikowane prompt-blocks zastępują prompt profilu

- **Kod:** `api/src/mastra/eva-turn-request-context.spec.ts` → `it('uses published prompt-blocks instead of the intent profile prompt')`
- **Krytyczność:** high
- **Logika:** Czat i Studio mają ten sam tekst co Editor; tool-e zostają z profilu.
- **Wejście:** context `pricing` + mock `getEditor().prompt`
- **Wyjście:** `'prompt ze Studio'`, nie `assembleTurnInstructions`

### ctx-006 — czat bez intent → zero shop-tooli

- **Kod:** `api/src/mastra/eva-turn-request-context.spec.ts` → `it('keeps production chat without intent on out_of_scope tools')`
- **Krytyczność:** high
- **Logika:** Produkcja bez `intent` nie dostaje pełnego katalogu — tylko `out_of_scope` (pusta mapa).
- **Wejście:** pusty `RequestContext` bez `mastra__isStudio`
- **Wyjście:** `toolsForRequestContext` → `{}`

### ctx-007 — Studio bez presetu → pełny katalog

- **Kod:** `api/src/mastra/eva-turn-request-context.spec.ts` → `it('exposes the full catalog in Studio when intent is unset')`
- **Krytyczność:** high
- **Logika:** Studio ustawia `mastra__isStudio`; bez presetu `intent` agent i `/tools` pokazują cały katalog projektu.
- **Wejście:** `RequestContext` z `mastra__isStudio: true`, bez `intent`
- **Wyjście:** wszystkie klucze katalogu shop-tooli

### ctx-008 — Studio z presetem intent → filtr profilu

- **Kod:** `api/src/mastra/eva-turn-request-context.spec.ts` → `it('still filters Studio tools when a request-context preset sets intent')`
- **Krytyczność:** high
- **Logika:** Preset `pricing` w Studio nie otwiera pełnego katalogu — zostaje filtr profilu.
- **Wejście:** `intent: pricing`, `mastra__isStudio: true`
- **Wyjście:** `quote-price`, `resolve-template`
