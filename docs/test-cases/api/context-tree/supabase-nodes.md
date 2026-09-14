# Adaptery Supabase (context tree)

Kod: `tests/api/context-tree/supabase/load-nodes.spec.ts`,
`tests/api/context-tree/supabase/load-embeddings.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: kolumny `eva_bot.context_nodes` → `ContextNode`;
`context_node_embeddings` → `{ slug, vector }` (string pgvector albo tablica).

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| supabase-tree-001 | critical | Mapowanie liścia |
| supabase-tree-002 | critical | Mapowanie wektorów indeksu |

### supabase-tree-001 — Mapowanie liścia

- **Kod:** `tests/api/context-tree/supabase/load-nodes.spec.ts` → `it('maps eva_bot.context_nodes onto the lookup contract')`
- **Krytyczność:** critical
- **Logika:** fakt z `body` tabeli, nie z modelu.
- **Wejście:** slug `dostawa` z treścią wysyłki
- **Wyjście:** `ContextNode` z `parentId` / `sortOrder` / `isActive`

### supabase-tree-002 — Mapowanie wektorów indeksu

- **Kod:** `tests/api/context-tree/supabase/load-embeddings.spec.ts` → `it('maps eva_bot.context_node_embeddings onto the search contract')`
- **Krytyczność:** critical
- **Logika:** tura czatu czyta wektory przez `DataStore`, bez `DATABASE_URL`.
- **Wejście:** `dostawa` jako tekst `[1,0,0]`, `kolory` jako tablica
- **Wyjście:** `{ slug, vector }` w obu kształtach
