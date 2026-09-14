# Resolver context tree (porty in-memory)

Kod: `tests/api/context-tree/context-tree.resolver.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: ten sam kontrakt domeny przez katalog in-memory (to, co
woła cienki serwis Nest). Lookup bez HTTP. `searchLeaves` przez port
embeddera (stub / null) i indeks wektorów in-memory — bez OpenAI i bez SQL.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| context-res-001 | medium | Znany liść → hit |
| context-res-002 | high | miss dla nieznanego sluga i gałęzi |
| context-res-003 | critical | stub embedder → slug bez body |
| context-res-004 | critical | brak embeddera → puste wyszukiwanie |

### context-res-001 — Znany liść → hit

- **Kod:** `tests/api/context-tree/context-tree.resolver.spec.ts` → `it('returns leaf body through in-memory catalogs')`
- **Krytyczność:** medium
- **Logika:** resolver składa fixture + `lookupContextLeaf`; wiring nie zmienia wyniku domeny.
- **Wejście:** slug `dostawa`
- **Wyjście:** `{ status: 'hit', slug: 'dostawa', body: 'Wysyłka w 5–7 dni roboczych.' }`

### context-res-002 — miss dla nieznanego sluga i gałęzi

- **Kod:** `tests/api/context-tree/context-tree.resolver.spec.ts` → `it('returns miss for unknown and branch slugs from the same catalog')`
- **Krytyczność:** high
- **Logika:** ten sam port nie zgaduje faktu przy luce ani przy slugu gałęzi.
- **Wejście:** `pielegnacja`, `info`
- **Wyjście:** `{ status: 'miss' }` w obu przypadkach

### context-res-003 — stub embedder → slug bez body

- **Kod:** `tests/api/context-tree/context-tree.resolver.spec.ts` → `it('returns dostawa slug through stub embedder and in-memory vectors')`
- **Krytyczność:** critical
- **Logika:** Nest składa embedder + indeks + `searchContextLeaves`; wynik bez `body`.
- **Wejście:** `kiedy wyślecie dywaniki` + mapa wektorów fixture
- **Wyjście:** `[{ slug: 'dostawa', score }]` bez `body`

### context-res-004 — brak embeddera → puste wyszukiwanie

- **Kod:** `tests/api/context-tree/context-tree.resolver.spec.ts` → `it('returns empty when embedder is missing')`
- **Krytyczność:** critical
- **Logika:** bez modelu embeddingu nie ma sieci i zostaje ścieżka miss.
- **Wejście:** `NullTextEmbedder` + to samo pytanie
- **Wyjście:** `[]`

