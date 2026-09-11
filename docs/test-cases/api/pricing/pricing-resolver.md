# Resolver wyceny (porty in-memory)

Kod: `api/src/pricing/pricing.resolver.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: ten sam kontrakt domeny przez katalogi in-memory (to, co
woła cienki serwis Nest). Bez HTTP i bez klienta Supabase. Bez importu kaskady.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| pricing-res-001 | medium | Znana kategoria + wariant → quoted |
| pricing-res-002 | high | Lista kategorii i unknown_variant z tych samych katalogów |

### pricing-res-001 — Znana kategoria + wariant → quoted

- **Kod:** `api/src/pricing/pricing.resolver.spec.ts` → `it('quotes a known category variant through in-memory catalogs')`
- **Krytyczność:** medium
- **Logika:** resolver składa fixture + `quotePrice`; wiring nie zmienia wyniku domeny.
- **Wejście:** `{ dealerPricingCategoryKey: 'passenger_car', variantKey: 'komplet-5szt' }`
- **Wyjście:** `{ status: 'quoted', amount: 599, currency: 'PLN' }`

### pricing-res-002 — Lista kategorii i unknown_variant z tych samych katalogów

- **Kod:** `api/src/pricing/pricing.resolver.spec.ts` → `it('lists category variants and domain errors from the same catalogs')`
- **Krytyczność:** high
- **Logika:** ten sam port zwraca listę wariantów kategorii i błąd bez kwoty przy wariancie spoza listy.
- **Wejście:** lista `passenger_car`; quote `nie-na-kategorii`
- **Wyjście:** dwa warianty kategorii; `{ status: 'unknown_variant' }`
