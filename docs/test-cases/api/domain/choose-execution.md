# Wybór wykonania tury

Kod: `tests/api/domain/choose-execution.spec.ts`

Logika zestawu: backend, nie model, wybiera wiedzę, tool albo workflow.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| exec-001 | critical | Wiedza o cenie bez quote-price |
| exec-002 | critical | Komplet slotów → quote-vehicle |
| exec-003 | high | Brak slotu → quote_vehicle |
| exec-004 | high | ambiguous → clarify |
| exec-005 | high | Kompletne dopasowanie → fitment_cascade |

### exec-001 — Wiedza o cenie bez quote-price

- **Kod:** `tests/api/domain/choose-execution.spec.ts` → `it('does not call quote-price for a knowledge question about price')`
- **Krytyczność:** critical
- **Logika:** `mode = knowledge` nie uruchamia toola wyceny tylko dlatego, że istnieje.
- **Wejście:** `indicative_quote`, `mode: knowledge`, puste encje
- **Wyjście:** `{ kind: 'knowledge', tools: [] }`

### exec-002 — Komplet slotów → quote-vehicle

- **Kod:** `tests/api/domain/choose-execution.spec.ts` → `it('points at quote-vehicle when brand and model are present')`
- **Krytyczność:** critical
- **Logika:** Przy komplecie czterech pól akcja wskazuje `directTool`, a `quote-price` zostaje na allowliście.
- **Wejście:** `Volkswagen`, `Golf 8`, rok `2019`, nadwozie `kombi`, `mode: action`
- **Wyjście:** `kind: tool`, tool `quote-vehicle`

### exec-003 — Brak slotu → quote_vehicle

- **Kod:** `tests/api/domain/choose-execution.spec.ts` → `it('starts quote_vehicle when the action is missing a slot')`
- **Krytyczność:** high
- **Logika:** Sam model bez marki nie wystarcza do `quote-vehicle`.
- **Wejście:** `car_model: Golf 8`, `mode: action`
- **Wyjście:** `{ kind: 'workflow', workflow: 'quote_vehicle' }`

### exec-005 — Kompletne dopasowanie → fitment_cascade

- **Kod:** `tests/api/domain/choose-execution.spec.ts` → `it('runs a complete fitment action through the cascade workflow')`
- **Krytyczność:** high
- **Logika:** Akcja z marką i modelem uruchamia kaskadę w workflow, nie jako bezpośredni tool.
- **Wejście:** `fitment`, `mode: action`, `Volkswagen`, `Golf 8`
- **Wyjście:** `{ kind: 'workflow', workflow: 'fitment_cascade' }`

### exec-004 — ambiguous → clarify

- **Kod:** `tests/api/domain/choose-execution.spec.ts` → `it('clarifies an ambiguous mode without tools')`
- **Krytyczność:** high
- **Logika:** Niejednoznaczny tryb nie woła shop-tooli.
- **Wejście:** `available_colors`, `mode: ambiguous`
- **Wyjście:** `{ kind: 'clarify' }`
