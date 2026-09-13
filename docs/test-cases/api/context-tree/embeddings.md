# Adapter embeddings context tree

Kod: `api/src/context-tree/embeddings/postgres-embeddings.spec.ts`,
`ingest.spec.ts`, `openai-text-embedder.spec.ts`, `run-ingest.spec.ts`,
`api/src/domain/context-leaf-ingest.spec.ts`  
Migracja: `supabase/migrations/20260913220000_context_node_embeddings.sql`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika: ingest tylko aktywnych liści z body; upsert po slugu; SQL bez body
w kontrakcie list(); OpenAI `text-embedding-3-small` za fake fetch.
Bez apply PROD.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| leaf-emb-001 | critical | Kwalifikacja ingestu pomija gałąź i puste seed |
| leaf-emb-002 | critical | Ingest zapisuje i nadpisuje slug |
| leaf-emb-003 | high | Adapter SQL mapuje wiersze na `{ slug, vector }` |
| leaf-emb-004 | high | OpenAI small zwraca wektor z mocka HTTP |
| leaf-emb-005 | high | Ingest skryptu skip bez env |

### leaf-emb-001 — Kwalifikacja ingestu pomija gałąź i puste seed

- **Kod:** `api/src/domain/context-leaf-ingest.spec.ts` → `it('keeps active leaves with body and skips branch, inactive, and empty legal seed')`
- **Krytyczność:** critical
- **Logika:** indeks nie zawiera gałęzi, wyłączonych liści ani pustego `chat-zapis`.
- **Wejście:** `CONTEXT_TREE_NODES`
- **Wyjście:** tylko `dostawa`

### leaf-emb-002 — Ingest zapisuje i nadpisuje slug

- **Kod:** `api/src/context-tree/embeddings/ingest.spec.ts` → `it('upserts active leaves with body and overwrites the same slug')`
- **Krytyczność:** critical
- **Logika:** ponowny ingest tego samego sluga zastępuje wektor.
- **Wejście:** fixture drzewa + stub embeddera
- **Wyjście:** jeden wiersz `dostawa`; drugi ingest zmienia wektor

### leaf-emb-003 — Adapter SQL mapuje wiersze

- **Kod:** `api/src/context-tree/embeddings/postgres-embeddings.spec.ts` → `it('maps eva_bot.context_node_embeddings onto the lookup contract')`
- **Krytyczność:** high
- **Logika:** Nest składa UPSERT/SELECT; brak DDL w requeście.
- **Wejście:** fake `query` + wektor `[1,0,0]`
- **Wyjście:** list → `{ slug: 'dostawa', vector: [1,0,0] }`

### leaf-emb-004 — OpenAI small z mocka HTTP

- **Kod:** `api/src/context-tree/embeddings/openai-text-embedder.spec.ts` → `it('posts text-embedding-3-small and returns the vector')`
- **Krytyczność:** high
- **Logika:** embedding woła Nest, nie Mastra; model `text-embedding-3-small`.
- **Wejście:** fake fetch, klucz `sk-test`
- **Wyjście:** `[0.1, 0.2]`

### leaf-emb-005 — Ingest skryptu skip bez env

- **Kod:** `api/src/context-tree/embeddings/run-ingest.spec.ts` → `it('skips when embedder or database env is missing')`; `api/scripts/ingest-context-leaves.test.mjs`
- **Krytyczność:** high
- **Logika:** `verify` bez `OPENAI_API_KEY` / `DATABASE_URL` nie woła sieci.
- **Wejście:** puste env
- **Wyjście:** `{ written: 0, skipped: true }` / `leafIngestEnabled` false

