# Gałąź tury (tool-e profilu)

Kod: `api/src/mastra/intents/prepare-intent-turn.spec.ts`

Logika zestawu: kwalifikacja → `IntentProfile` → mapa tooli tury ⊆ katalogu
Nest. `quote-price` tylko na `pricing`. SSE bez zmiany (`stream-chat-message.spec.ts`).

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| turn-001 | critical | pricing: resolve-template + quote-price |
| turn-002 | critical | product_info bez quote-price |
| turn-003 | high | Brak id w katalogu → błąd, nie cichy drop |
| turn-004 | critical | delivery: search-leaves + lookup-leaf |

### turn-001 — pricing: resolve-template + quote-price

- **Kod:** `api/src/mastra/intents/prepare-intent-turn.spec.ts` → `it('gives pricing the quote-price and resolve-template tools')`
- **Krytyczność:** critical
- **Logika:** Gałąź wyceny widzi macierz i kaskadę; instrukcja profilu trafia do tury.
- **Wejście:** stub qualify `Ile kosztują dywaniki do Golfa 8?` + katalog 3 tooli
- **Wyjście:** `intent: pricing`, klucze `quote-price` i `resolve-template`

### turn-002 — product_info bez quote-price

- **Kod:** `api/src/mastra/intents/prepare-intent-turn.spec.ts` → `it('does not expose quote-price on product_info')`
- **Krytyczność:** critical
- **Logika:** Kwota nie może być wywołana na Q&A — tool nie ma w mapie tury.
- **Wejście:** `Czy dywaniki pasują do Golfa 8?`
- **Wyjście:** `intent: product_info`, brak `quote-price`, są `resolve-template`, `lookup-leaf` i `search-leaves`

### turn-004 — delivery: search-leaves + lookup-leaf

- **Kod:** `api/src/mastra/intents/prepare-intent-turn.spec.ts` → `it('gives delivery search-leaves and lookup-leaf without quote-price')`
- **Krytyczność:** critical
- **Logika:** FAQ dostawy ma wyszukiwanie sluga i lookup; bez kwoty. Puste search = miss.
- **Wejście:** `Jaki jest termin dostawy?`
- **Wyjście:** tool-e `search-leaves` i `lookup-leaf`; instrukcja zawiera miss / search-leaves

### turn-003 — Brak id w katalogu → błąd, nie cichy drop

- **Kod:** `api/src/mastra/intents/prepare-intent-turn.spec.ts` → `it('throws when a profile tool is missing from the catalog')`
- **Krytyczność:** high
- **Logika:** Nieznane id toola nie jest pomijane.
- **Wejście:** katalog tylko `lookup-leaf`, żądanie `quote-price`
- **Wyjście:** throw `unknown shop tool: quote-price`
