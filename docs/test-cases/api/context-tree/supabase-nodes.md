# Adaptery Supabase (context tree)

Kod: `api/src/context-tree/supabase/load-nodes.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: kolumny `eva_bot.context_nodes` → `ContextNode`.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| supabase-tree-001 | critical | Mapowanie liścia |

### supabase-tree-001 — Mapowanie liścia

- **Kod:** `api/src/context-tree/supabase/load-nodes.spec.ts` → `it('maps eva_bot.context_nodes onto the lookup contract')`
- **Krytyczność:** critical
- **Logika:** fakt z `body` tabeli, nie z modelu.
- **Wejście:** slug `dostawa` z treścią wysyłki
- **Wyjście:** `ContextNode` z `parentId` / `sortOrder` / `isActive`
