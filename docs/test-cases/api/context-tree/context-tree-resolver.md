# Resolver context tree (porty in-memory)

Kod: `api/src/context-tree/context-tree.resolver.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: ten sam kontrakt domeny przez katalog in-memory (to, co
woła cienki serwis Nest). Bez HTTP, bez RAG, bez importu wyceny/kaskady.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| context-res-001 | medium | Znany liść → hit |
| context-res-002 | high | miss dla nieznanego sluga i gałęzi |

### context-res-001 — Znany liść → hit

- **Kod:** `api/src/context-tree/context-tree.resolver.spec.ts` → `it('returns leaf body through in-memory catalogs')`
- **Krytyczność:** medium
- **Logika:** resolver składa fixture + `lookupContextLeaf`; wiring nie zmienia wyniku domeny.
- **Wejście:** slug `dostawa`
- **Wyjście:** `{ status: 'hit', slug: 'dostawa', body: 'Wysyłka w 5–7 dni roboczych.' }`

### context-res-002 — miss dla nieznanego sluga i gałęzi

- **Kod:** `api/src/context-tree/context-tree.resolver.spec.ts` → `it('returns miss for unknown and branch slugs from the same catalog')`
- **Krytyczność:** high
- **Logika:** ten sam port nie zgaduje faktu przy luce ani przy slugu gałęzi.
- **Wejście:** `pielegnacja`, `info`
- **Wyjście:** `{ status: 'miss' }` w obu przypadkach
