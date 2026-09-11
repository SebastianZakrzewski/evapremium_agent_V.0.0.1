# Resolver kaskady (porty in-memory)

Kod: `api/src/templates/template-cascade.resolver.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: ten sam kontrakt domeny przez katalogi in-memory (to, co
woła cienki serwis Nest). Bez HTTP i bez klienta Supabase.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| cascade-res-001 | medium | Znane auto → one |
| cascade-res-002 | high | none i many z tych samych katalogów |

### cascade-res-001 — Znane auto → one

- **Kod:** `api/src/templates/template-cascade.resolver.spec.ts` → `it('resolves a known vehicle to one template')`
- **Krytyczność:** medium
- **Logika:** resolver składa fixture + `resolveTemplate`; wiring nie zmienia wyniku domeny.
- **Wejście:** `{ brand: 'vw', model: 'golf 8', bodyType: 'kombi', year: 2021 }`
- **Wyjście:** `{ status: 'one', template.id: 'tmpl-golf-mk8-wagon' }`

### cascade-res-002 — none i many z tych samych katalogów

- **Kod:** `api/src/templates/template-cascade.resolver.spec.ts` → `it('returns none and many from the same catalogs')`
- **Krytyczność:** high
- **Logika:** ten sam port zwraca 0 albo N; serwis nie zgaduje przy luce ani przy wielu wierszach.
- **Wejście:** `{ brand: 'brak' }` oraz `{ brand: 'vw' }`
- **Wyjście:** `{ status: 'none' }` oraz `status: 'many'`
