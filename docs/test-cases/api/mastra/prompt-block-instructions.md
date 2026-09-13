# Prompt-blocks w instrukcjach tury

Kod: `api/src/mastra/prompt-block-instructions.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: system prompt agenta EVA pochodzi z opublikowanych
prompt-blocks; pusty Editor albo błąd storage nie zrywa tury (fallback w
`instructionsForRequestContext`).

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| prompt-blocks-001 | high | Preview z `intent` w kontekście |
| prompt-blocks-002 | high | Brak opublikowanych bloków → undefined |
| prompt-blocks-003 | medium | Błąd Editora → undefined |

### prompt-blocks-001 — Preview z `intent` w kontekście

- **Kod:** `api/src/mastra/prompt-block-instructions.spec.ts` → `it('joins published prompt-blocks with intent in preview context')`
- **Krytyczność:** high
- **Logika:** Display conditions / `{{intent}}` muszą dostać zaakceptowaną intencję tury.
- **Wejście:** reader z jednym id, intent `pricing`
- **Wyjście:** tekst z `preview`; wywołanie z `{ intent: 'pricing' }`

### prompt-blocks-002 — Brak opublikowanych bloków → undefined

- **Kod:** `api/src/mastra/prompt-block-instructions.spec.ts` → `it('returns undefined when no published blocks exist')`
- **Krytyczność:** high
- **Logika:** `verify` i świeża baza nadal składają prompt z profilu.
- **Wejście:** pusta lista id
- **Wyjście:** `undefined` (bez `preview`)

### prompt-blocks-003 — Błąd Editora → undefined

- **Kod:** `api/src/mastra/prompt-block-instructions.spec.ts` → `it('returns undefined when the editor throws')`
- **Krytyczność:** medium
- **Logika:** Awaria LibSQL nie może wyłączyć czatu.
- **Wejście:** `listPublishedIds` rzuca
- **Wyjście:** `undefined`
