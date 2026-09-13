# Query `orderBy` ze Studio

Kod: `api/src/mastra/coerce-mastra-query.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: CLI Studio wysyła `orderBy` jako string; Nest Mastra waliduje
obiekt. Publish promptu pada na 400 bez tej koercji.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| coerce-query-001 | high | String `createdAt` → `{ field, direction }` |
| coerce-query-002 | medium | JSON string → obiekt |
| coerce-query-003 | high | `versionNumber` mapuje na `createdAt` |
| coerce-query-004 | low | Obiekt zostaje bez zmian |
| coerce-query-005 | high | Query string Studio (parser Express 5) |

### coerce-query-001 — String `createdAt` → `{ field, direction }`

- **Kod:** `api/src/mastra/coerce-mastra-query.spec.ts` → `it('turns Studio string orderBy into the object Nest validates')`
- **Krytyczność:** high
- **Logika:** Błąd Studio: `orderBy` expected object, received string.
- **Wejście:** `orderBy: 'createdAt'`, `sortDirection: 'ASC'`
- **Wyjście:** `{ field: 'createdAt', direction: 'ASC' }`

### coerce-query-002 — JSON string → obiekt

- **Kod:** `api/src/mastra/coerce-mastra-query.spec.ts` → `it('parses JSON orderBy strings')`
- **Krytyczność:** medium
- **Logika:** Inne klienty kodują `orderBy` jako JSON w query.
- **Wejście:** string JSON z `updatedAt`
- **Wyjście:** sparsowany obiekt

### coerce-query-003 — `versionNumber` mapuje na `createdAt`

- **Kod:** `api/src/mastra/coerce-mastra-query.spec.ts` → `it('maps versionNumber to createdAt so publish version lists validate')`
- **Krytyczność:** high
- **Logika:** Lista wersji promptu sortuje po `versionNumber`; schema Nestu zna `createdAt` / `updatedAt`.
- **Wejście:** `orderBy: 'versionNumber'`
- **Wyjście:** `{ field: 'createdAt', direction: 'DESC' }`

### coerce-query-004 — Obiekt zostaje bez zmian

- **Kod:** `api/src/mastra/coerce-mastra-query.spec.ts` → `it('leaves object orderBy unchanged')`
- **Krytyczność:** low
- **Logika:** `orderBy[field]=` z qs już jest obiektem.
- **Wejście:** obiekt `{ field, direction }`
- **Wyjście:** ta sama referencja

### coerce-query-005 — Query string Studio (parser Express 5)

- **Kod:** `api/src/mastra/coerce-mastra-query.spec.ts` → `it('parses Express query strings used by Studio publish')`
- **Krytyczność:** high
- **Logika:** Express 5 nie pozwala nadpisać `req.query`; parser musi zwrócić obiekt.
- **Wejście:** `orderBy=createdAt&sortDirection=DESC`
- **Wyjście:** `{ field: 'createdAt', direction: 'DESC' }`
