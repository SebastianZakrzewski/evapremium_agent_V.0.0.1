# Log tury intencji

Kod: `tests/api/mastra/intents/intent-turn-log.spec.ts`

Logika zestawu: jedna linia konsoli na turę — sesja, intencje, sub-intencja,
tryb, wykonanie, cel, tool-e; bez treści wiadomości.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| log-001 | medium | Blok tury: sesja, trasa intencji, narzędzia, zakres |
| log-003 | medium | Kolor ANSI i odrzucony kandydat; `NO_COLOR` gasi kody |
| log-002 | medium | prepareIntentTurn woła log raz na turę |

### log-001 — Blok tury: sesja, trasa intencji, narzędzia, zakres

- **Kod:** `tests/api/mastra/intents/intent-turn-log.spec.ts` → `it('prints session and intent fields without message text')`
- **Krytyczność:** medium
- **Logika:** Diagnostyka tury bez PII z czatu. Jedna wiadomość `console.info` to blok wierszy, nie ciąg `klucz=wartość`.
- **Wejście:** session-1, current product_info, candidate/accepted pricing, `color: false`
- **Wyjście:** `[intent-turn]` z wierszami było / kandydat / przyjęto / sub-intencja / tryb / wykonanie / cel / narzędzia / zakres `w ofercie`; brak słów z treści klienta

### log-003 — Kolor ANSI i odrzucony kandydat; `NO_COLOR` gasi kody

- **Kod:** `tests/api/mastra/intents/intent-turn-log.spec.ts` → `it('colors accepted intent and marks a rejected candidate')`, `it('omits ANSI when NO_COLOR is set')`
- **Krytyczność:** medium
- **Logika:** Kandydat różny od przyjętej intencji jest żółty, przyjęta intencja w ofercie zielona. Wymuszony `out_of_scope` opisuje zakres „wymuszony poza ofertą”. Niepuste `NO_COLOR` wyłącza sekwencje ANSI, żeby zbieranie logów zostało czystym tekstem.
- **Wejście:** odrzucone przejście pricing ← out_of_scope; osobno tura wymuszona przy `NO_COLOR=1`
- **Wyjście:** kody `\x1b[33m` / `\x1b[32m` albo sam tekst bez `\x1b[`

### log-002 — prepareIntentTurn woła log raz na turę

- **Kod:** `tests/api/mastra/intents/intent-turn-log.spec.ts` → `it('emits one turn log with session and accepted intent')`
- **Krytyczność:** medium
- **Logika:** Jedno wykonanie = jeden wpis z accepted i toolami tury.
- **Wejście:** stub, sesja session-log, current product_info, pytanie o cenę
- **Wyjście:** jeden log, accepted pricing, sub-intencja `indicative_quote`, tryb `action`, wykonanie `workflow`, cel `quote_vehicle`, forcedOutOfScope false
