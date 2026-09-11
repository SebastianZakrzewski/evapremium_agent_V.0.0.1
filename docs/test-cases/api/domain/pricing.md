# Wycena (domena)

Kod: `api/src/domain/pricing.spec.ts`  
Fixture: `api/src/pricing/in-memory/pricing-fixture.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: kategoria szablonu + wariant z `pricing_category_variants`
(+ `mat_type` gdy dual) → jedna kwota z `pricing_matrix` albo błąd domeny
**bez** `amount`. LLM nie uczestniczy.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| pricing-001 | high | Lista wariantów tylko z kategorii |
| pricing-002 | critical | Znana kategoria + wariant → jedna kwota |
| pricing-003 | critical | Dual `mat_type` + wybór → jedna kwota |
| pricing-004 | critical | Dual bez `mat_type` → błąd, nie liczba |
| pricing-005 | critical | Wariant spoza kategorii → błąd, nie liczba |
| pricing-006 | high | Wariant na kategorii, brak wiersza macierzy |

### pricing-001 — Lista wariantów tylko z kategorii

- **Kod:** `api/src/domain/pricing.spec.ts` → `it('lists only variants attached to the template category')`
- **Krytyczność:** high
- **Logika:** agent pyta o wariant wyłącznie z `pricing_category_variants` dla kategorii szablonu, nie z pełnego słownika.
- **Wejście:** `dealerPricingCategoryKey: 'passenger_car'` + fixture
- **Wyjście:** `komplet-5szt`, `kierowca`; bez `nie-na-kategorii`

### pricing-002 — Znana kategoria + wariant → jedna kwota

- **Kod:** `api/src/domain/pricing.spec.ts` → `it('quotes one amount from the matrix for a known category and variant')`
- **Krytyczność:** critical
- **Logika:** jedna para kategoria + wariant z jednym `mat_type` w macierzy daje jedną orientacyjną kwotę; nie zgadujemy ceny.
- **Wejście:** `{ dealerPricingCategoryKey: 'passenger_car', variantKey: 'komplet-5szt' }`
- **Wyjście:** `{ status: 'quoted', amount: 599, currency: 'PLN' }`

### pricing-003 — Dual `mat_type` + wybór → jedna kwota

- **Kod:** `api/src/domain/pricing.spec.ts` → `it('quotes when dual mat types are resolved with mat_type')`
- **Krytyczność:** critical
- **Logika:** przy dwóch typach maty w macierzy kwota powstaje dopiero po `mat_type`.
- **Wejście:** pickup + `komplet-5szt` + `matType: '3d-with-rims'`
- **Wyjście:** `{ status: 'quoted', amount: 1099, currency: 'PLN' }`

### pricing-004 — Dual bez `mat_type` → błąd, nie liczba

- **Kod:** `api/src/domain/pricing.spec.ts` → `it('returns a domain error when mat_type is required and missing')`
- **Krytyczność:** critical
- **Logika:** brak wyboru typu maty nie może stać się kwotą.
- **Wejście:** pickup + `komplet-5szt` bez `matType`
- **Wyjście:** `{ status: 'mat_type_required' }` bez `amount`

### pricing-005 — Wariant spoza kategorii → błąd, nie liczba

- **Kod:** `api/src/domain/pricing.spec.ts` → `it('returns a domain error when the variant is not on the category')`
- **Krytyczność:** critical
- **Logika:** wariant ze słownika globalnego, niepodpięty do kategorii, nie daje ceny.
- **Wejście:** `passenger_car` + `nie-na-kategorii`
- **Wyjście:** `{ status: 'unknown_variant' }` bez `amount`

### pricing-006 — Wariant na kategorii, brak wiersza macierzy

- **Kod:** `api/src/domain/pricing.spec.ts` → `it('returns a domain error when the category has the variant but the matrix has no row')`
- **Krytyczność:** high
- **Logika:** brak wiersza `pricing_matrix` = brak kwoty, nie wymyślona liczba.
- **Wejście:** `minivan` + `komplet-5szt`
- **Wyjście:** `{ status: 'missing_matrix_row' }` bez `amount`
