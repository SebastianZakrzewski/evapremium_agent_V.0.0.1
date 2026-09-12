# Adaptery Supabase (katalog szablonów)

Kod: `api/src/templates/supabase/load-catalog.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: mapowanie kolumn `evapremium_shop.mat_templates` na kontrakt
kaskady. Bez sieci do PROD (`MemoryDataStore`).

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| supabase-tmpl-001 | critical | Mapowanie wiersza szablonu |

### supabase-tmpl-001 — Mapowanie wiersza szablonu

- **Kod:** `api/src/templates/supabase/load-catalog.spec.ts` → `it('maps shop columns onto the cascade contract')`
- **Krytyczność:** critical
- **Logika:** LLM nie czyta tabeli; Nest dostaje te same pola co fixture.
- **Wejście:** jeden wiersz snake_case (`brand_key`, `dealer_pricing_category_key`, …)
- **Wyjście:** `MatTemplate` camelCase gotowy do `resolveTemplate`
