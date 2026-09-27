# Gałąź tury (tool-e profilu)

Kod: `tests/api/mastra/intents/prepare-intent-turn.spec.ts`

Logika zestawu: kwalifikacja → `IntentProfile` → mapa tooli tury ⊆ katalogu
Nest. `quote-price` tylko na `pricing`. SSE bez zmiany (`stream-chat-message.spec.ts`).

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| turn-001 | critical | pricing z marką i modelem: quote-vehicle |
| turn-005 | high | wycena bez marki → workflow, zero quote-price |
| turn-002 | critical | Pytanie o dopasowanie z modelem → fitment_cascade |
| turn-003 | high | Brak id w katalogu → błąd, nie cichy drop |
| turn-004 | critical | delivery: search-leaves + lookup-leaf |
| turn-006 | critical | Zapisane one wraca przy „już podałem” |

### turn-001 — pricing: quote-vehicle

- **Kod:** `tests/api/mastra/intents/prepare-intent-turn.spec.ts` → `it('gives a complete pricing turn the quote-vehicle tool')`
- **Krytyczność:** critical
- **Logika:** Gałąź wyceny widzi macierz i kaskadę; instrukcja profilu trafia do tury.
- **Wejście:** stub qualify `Ile kosztują dywaniki Volkswagen Golf 8?` + katalog tooli
- **Wyjście:** `intent: pricing`, wykonanie `tool` / `quote-vehicle`, jedyny klucz `quote-vehicle`

### turn-005 — wycena bez marki → workflow

- **Kod:** `tests/api/mastra/intents/prepare-intent-turn.spec.ts` → `it('holds quote tools until the vehicle workflow has both slots')`
- **Krytyczność:** high
- **Logika:** Sam model bez marki nie wystawia `quote-price`. Tura czeka na slot.
- **Wejście:** `Ile kosztują dywaniki do Golfa 8?`
- **Wyjście:** `execution.kind: workflow`, `toolIds: []`, krok `waiting_for_vehicle`

### turn-002 — Pytanie o dopasowanie z modelem → fitment_cascade

- **Kod:** `tests/api/mastra/intents/prepare-intent-turn.spec.ts` → `it('starts the fitment cascade when the question names a model')`
- **Krytyczność:** critical
- **Logika:** Nazwany model otwiera kaskadę. Tura nie dostaje `quote-price` ani `resolve-template`.
- **Wejście:** `Czy dywaniki pasują do Golfa 8?`
- **Wyjście:** `workflow: fitment_cascade`, puste toole, nota `Brakuje marki auta` i `model=Golf 8`

### turn-004 — delivery: search-leaves + lookup-leaf

- **Kod:** `tests/api/mastra/intents/prepare-intent-turn.spec.ts` → `it('gives delivery search-leaves and lookup-leaf without quote-price')`
- **Krytyczność:** critical
- **Logika:** FAQ dostawy ma wyszukiwanie sluga i lookup; bez kwoty. Puste search = miss.
- **Wejście:** `Jaki jest termin dostawy?`
- **Wyjście:** tool-e `search-leaves` i `lookup-leaf`; instrukcja zawiera miss / search-leaves

### turn-003 — Brak id w katalogu → błąd, nie cichy drop

- **Kod:** `tests/api/mastra/intents/prepare-intent-turn.spec.ts` → `it('throws when a profile tool is missing from the catalog')`
- **Krytyczność:** high
- **Logika:** Nieznane id toola nie jest pomijane.
- **Wejście:** katalog tylko `lookup-leaf`, żądanie `quote-price`
- **Wyjście:** throw `unknown shop tool: quote-price`

### turn-006 — Zapisane one wraca przy „już podałem”

- **Kod:** `tests/api/mastra/intents/prepare-intent-turn.spec.ts` → `it('reuses a resolved session car when the follow-up does not name a vehicle')`
- **Krytyczność:** critical
- **Logika:** profil z `cascadeStatus=one` wchodzi do tury, zanim model odpowie. Encja równa całemu zdaniu nie podmienia marki i nie kasuje `recordKey`.
- **Wejście:** „juz podalem”, encja `car_brand=juz podalem`, znane auto Toyota RAV 4 2021 SUV z `recordKey`
- **Wyjście:** `execution=knowledge`, notatka z `marka=Toyota` i `recordKey`, encja marki Toyota

