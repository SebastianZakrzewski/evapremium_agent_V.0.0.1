# Adaptery Supabase (cennik)

Kod: `tests/api/pricing/supabase/load-pricing.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: join aktywnej wersji katalogu, kategorii i wariantu → kwota
`base_price_pln`. Bez sieci.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| supabase-price-001 | critical | Macierz aktywnego katalogu |

### supabase-price-001 — Macierz aktywnego katalogu

- **Kod:** `tests/api/pricing/supabase/load-pricing.spec.ts` → `it('joins active catalog matrix onto category slug and variant_key')`
- **Krytyczność:** critical
- **Logika:** kwota z aktywnego `pricing_catalog_versions`, nie ze starej wersji.
- **Wejście:** dwie wersje katalogu; wiersz 599 PLN na `cat-live`
- **Wyjście:** `amount: 599`, `dealerPricingCategoryKey: passenger_car`, `komplet-5szt`
