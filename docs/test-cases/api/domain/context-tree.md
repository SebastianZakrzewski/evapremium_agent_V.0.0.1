# Context tree (domena)

Kod: `tests/api/domain/context-tree.spec.ts`  
Fixture: `tests/api/context-tree/in-memory/context-tree-fixture.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: slug aktywnego liścia → `body` (może być puste); brak liścia
→ `miss` bez zmyślonego tekstu. Bez RAG i bez LLM.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| context-001 | critical | Znany liść → body |
| context-002 | high | Seed `chat-zapis` / `zgoda-lead` → hit, puste body |
| context-003 | critical | Nieznany slug → miss |
| context-004 | high | Gałąź i nieaktywny liść → miss |

### context-001 — Znany liść → body

- **Kod:** `tests/api/domain/context-tree.spec.ts` → `it('returns leaf body for a known slug')`
- **Krytyczność:** critical
- **Logika:** fakt sklepu pochodzi z liścia context tree, nie z modelu.
- **Wejście:** slug `dostawa` + fixture
- **Wyjście:** `{ status: 'hit', slug: 'dostawa', title: 'Dostawa', body: 'Wysyłka w 5–7 dni roboczych.' }`

### context-002 — Seed `chat-zapis` / `zgoda-lead` → hit, puste body

- **Kod:** `tests/api/domain/context-tree.spec.ts` → `it('returns a hit with empty body for seeded legal leaves')`
- **Krytyczność:** high
- **Logika:** treść prawną wkleja biznes; puste body to hit, nie pretekst do wygenerowania klauzuli.
- **Wejście:** slug `chat-zapis` oraz `zgoda-lead`
- **Wyjście:** `{ status: 'hit', body: '' }` (tytuły z fixture)

### context-003 — Nieznany slug → miss

- **Kod:** `tests/api/domain/context-tree.spec.ts` → `it('returns miss for an unknown slug without inventing copy')`
- **Krytyczność:** critical
- **Logika:** brak liścia = brak faktu; nie halucynujemy polityki.
- **Wejście:** slug `pielegnacja`
- **Wyjście:** `{ status: 'miss' }` bez `body`

### context-004 — Gałąź i nieaktywny liść → miss

- **Kod:** `tests/api/domain/context-tree.spec.ts` → `it('returns miss for a branch slug and for an inactive leaf')`
- **Krytyczność:** high
- **Logika:** body jest tylko u aktywnego liścia; gałąź i wyłączony węzeł nie są źródłem faktu.
- **Wejście:** slug `info` (ma dzieci) oraz `archiwum-gwarancja` (`is_active: false`)
- **Wyjście:** `{ status: 'miss' }` w obu przypadkach
