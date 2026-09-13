# Pamięć intencji sesji i filtr krawędzi

Kod: `api/src/mastra/intents/accept-intent-transition.spec.ts`

Logika zestawu: `acceptIntentTransition` przepuszcza kandydata tylko gdy
krawędź jest dozwolona; `InMemoryIntentSessionState` trzyma temat rozmowy;
wymuszone `out_of_scope` (niska pewność) omija filtr.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| memory-001 | high | Brak stanu → przyjmij kandydata |
| memory-002 | high | product_info → pricing dozwolone |
| memory-003 | high | product_info odrzuca out_of_scope (pewny qualify) |
| memory-004 | medium | out_of_scope może wrócić do product_info |
| memory-005 | critical | Druga tura FAQ→cena ładuje quote-price |
| memory-006 | high | Pewny out_of_scope przy FAQ nie otwiera ceny |
| memory-007 | medium | Sesje nie dzielą stanu |
| memory-008 | high | Niska pewność i tak → out_of_scope |

### memory-001 — Brak stanu → przyjmij kandydata

- **Kod:** `api/src/mastra/intents/accept-intent-transition.spec.ts` → `it('accepts the candidate when the session has no current intent')`
- **Krytyczność:** high
- **Logika:** Pierwsza wiadomość nie ma „skąd”.
- **Wejście:** `from: undefined`, `to: pricing`
- **Wyjście:** `pricing`

### memory-002 — product_info → pricing dozwolone

- **Kod:** `api/src/mastra/intents/accept-intent-transition.spec.ts` → `it('allows product_info to switch to pricing')`
- **Krytyczność:** high
- **Logika:** Krawędź z profilu FAQ.
- **Wejście:** `product_info` → `pricing`
- **Wyjście:** `pricing`

### memory-003 — product_info odrzuca out_of_scope (pewny qualify)

- **Kod:** `api/src/mastra/intents/accept-intent-transition.spec.ts` → `it('rejects an off-graph candidate and keeps product_info')`
- **Krytyczność:** high
- **Logika:** `out_of_scope` nie jest na `allowedTransitions` FAQ — filtr zostawia stan.
- **Wejście:** `product_info` → `out_of_scope`
- **Wyjście:** `product_info`

### memory-004 — out_of_scope może wrócić do product_info

- **Kod:** `api/src/mastra/intents/accept-intent-transition.spec.ts` → `it('allows leaving out_of_scope toward product_info')`
- **Krytyczność:** medium
- **Logika:** Routing na profilu OOS.
- **Wejście:** `out_of_scope` → `product_info`
- **Wyjście:** `product_info`

### memory-005 — Druga tura FAQ→cena ładuje quote-price

- **Kod:** `api/src/mastra/intents/accept-intent-transition.spec.ts` → `it('loads pricing tools on a legal switch from product_info')`
- **Krytyczność:** critical
- **Logika:** Pamięć sesji + legalna krawędź otwiera macierz.
- **Wejście:** ta sama sesja, fit potem „ile kosztują”
- **Wyjście:** druga tura `pricing` z `quote-price`

### memory-006 — Pewny out_of_scope przy FAQ nie otwiera ceny

- **Kod:** `api/src/mastra/intents/accept-intent-transition.spec.ts` → `it('keeps product_info tools when qualify proposes out_of_scope')`
- **Krytyczność:** high
- **Logika:** Kandydat odrzucony → tool-e FAQ, bez `quote-price`.
- **Wejście:** `currentIntent: product_info`, qualify `out_of_scope` 1.0
- **Wyjście:** `product_info`, `lookup-leaf` + `resolve-template` + `search-leaves`

### memory-007 — Sesje nie dzielą stanu

- **Kod:** `api/src/mastra/intents/accept-intent-transition.spec.ts` → `it('does not share intent across sessions')`
- **Krytyczność:** medium
- **Logika:** Map po `sessionId`.
- **Wejście:** `one=pricing`, odczyt `two`
- **Wyjście:** `undefined`

### memory-008 — Niska pewność i tak → out_of_scope

- **Kod:** `api/src/mastra/intents/accept-intent-transition.spec.ts` → `it('still forces out_of_scope after low-confidence fallback')`
- **Krytyczność:** high
- **Logika:** Fallback Slice 4 nie jest blokowany grafem.
- **Wejście:** `currentIntent: product_info`, dwa wyniki 0.1 / 0.2
- **Wyjście:** `out_of_scope`, `toolIds: []`
