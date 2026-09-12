# MastraChatAgent — request context

Kod: `api/src/chat/mastra-chat.agent.spec.ts`

Logika zestawu: czat Nest nie tworzy `Agent` co turę. Po qualify woła
zarejestrowanego agenta z `requestContext.intent`.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| chat-mastra-001 | high | jedna instancja + intent w stream |

### chat-mastra-001 — jedna instancja + intent w stream

- **Kod:** `api/src/chat/mastra-chat.agent.spec.ts` → `it('reuses one agent and passes accepted intent in requestContext')`
- **Krytyczność:** high
- **Logika:** DeepSeek/Studio dostają `intent` tury; tool-e i prompt liczy agent z contextu, nie nowy konstruktor.
- **Wejście:** stub qualify wyceny, fake `agent.stream`
- **Wyjście:** jedno `stream`, `requestContext.get('intent') === 'pricing'`, tekst `ok`
