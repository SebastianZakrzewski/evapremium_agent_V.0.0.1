# Log tury intencji

Kod: `tests/api/mastra/intents/intent-turn-log.spec.ts`

Logika zestawu: jedna linia konsoli na turę — sesja, intencje, tool-e; bez
treści wiadomości.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| log-001 | medium | Format linii: session / current / candidate / accepted / tools |
| log-002 | medium | prepareIntentTurn woła log raz na turę |

### log-001 — Format linii: session / current / candidate / accepted / tools

- **Kod:** `tests/api/mastra/intents/intent-turn-log.spec.ts` → `it('prints session and intent fields without message text')`
- **Krytyczność:** medium
- **Logika:** Diagnostyka tury bez PII z czatu.
- **Wejście:** session-1, current product_info, candidate/accepted pricing
- **Wyjście:** linia `[intent-turn] ...`; brak słów z treści klienta

### log-002 — prepareIntentTurn woła log raz na turę

- **Kod:** `tests/api/mastra/intents/intent-turn-log.spec.ts` → `it('emits one turn log with session and accepted intent')`
- **Krytyczność:** medium
- **Logika:** Jedno wykonanie = jeden wpis z accepted i toolami tury.
- **Wejście:** stub, sesja session-log, current product_info, pytanie o cenę
- **Wyjście:** jeden log, accepted pricing, forcedOutOfScope false
