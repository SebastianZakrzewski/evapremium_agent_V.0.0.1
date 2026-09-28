# MastraChatAgent — request context

Kod: `tests/api/chat/mastra-chat.agent.spec.ts`

Logika zestawu: czat Nest nie tworzy `Agent` co turę. Tura wczytuje stan sesji,
przygotowuje intencję, zapamiętuje klienta i zapisuje eventy, potem woła
zarejestrowanego agenta z `requestContext.intent`.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| chat-mastra-001 | high | jedna instancja + intent w stream |
| chat-mastra-002 | high | auto sesji tylko gdy tura go potrzebuje |

### chat-mastra-001 — jedna instancja + intent w stream

- **Kod:** `tests/api/chat/mastra-chat.agent.spec.ts` → `it('reuses one agent and passes accepted intent in requestContext')`
- **Krytyczność:** high
- **Logika:** DeepSeek/Studio dostają `intent` tury; tool-e i prompt liczy agent z contextu, nie nowy konstruktor.
- **Wejście:** stub qualify wyceny, fake `agent.stream`
- **Wyjście:** jedno `stream`, `requestContext.get('intent') === 'pricing'`, tekst `ok`

### chat-mastra-002 — auto sesji tylko gdy tura go potrzebuje

- **Kod:** `tests/api/chat/mastra-chat.agent.spec.ts` → `it('adds the stored car only on a turn that fits or prices the vehicle')`
- **Krytyczność:** high
- **Logika:** profil siedzi w store sesji. `executionNote` dostaje markę przy dopasowaniu, nie przy pytaniu o kolory.
- **Wejście:** trzy tury tej samej sesji: dopasowanie Toyoty, kolory, dopasowanie bez nazwy auta
- **Wyjście:** notatka kolorów bez `marka=Toyota`; trzecia notatka z zapisaną marką

