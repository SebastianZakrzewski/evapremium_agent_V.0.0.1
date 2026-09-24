# Składanie wyceny auta

Kod: `tests/api/domain/quote-vehicle-price.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: `composeQuoteVehicle` woła kaskadę, potem warianty kategorii
i macierz. Kwota tylko przy `quoted`. Model nie dostaje id szablonu.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| quote-veh-001 | critical | Jeden szablon + wariant → kwota |
| quote-veh-002 | critical | Brak wariantu → need_variant, bez kwoty |
| quote-veh-003 | high | Pusty variantKey jak brak |
| quote-veh-004 | high | Wiele szablonów → many, bez kwoty |
| quote-veh-005 | high | Brak szablonu → none, bez kwoty |
| quote-veh-006 | critical | Wariant spoza kategorii → need_variant |
| quote-veh-007 | critical | Dwa typy maty → mat_type_required |
| quote-veh-008 | critical | Wybrany typ maty → kwota |
| quote-veh-009 | high | Wariant na kategorii, brak wiersza macierzy |

### quote-veh-001 — Jeden szablon + wariant → kwota

- **Kod:** `tests/api/domain/quote-vehicle-price.spec.ts` → `it('quotes one amount when cascade is one and the variant is on the category')`
- **Krytyczność:** critical
- **Logika:** Golf 8 hatchback ma jeden szablon `passenger_car`; wariant z kategorii czyta macierz.
- **Wejście:** `vw`, `golf 8`, `hatchback`, `variantKey: komplet-5szt`
- **Wyjście:** `{ status: 'quoted', amount: 599, currency: 'PLN' }`

### quote-veh-002 — Brak wariantu → need_variant, bez kwoty

- **Kod:** `tests/api/domain/quote-vehicle-price.spec.ts` → `it('asks for a category variant and does not quote when variantKey is missing')`
- **Krytyczność:** critical
- **Logika:** jeden szablon Audi A4 nie wystarcza do kwoty; opcje to tylko warianty `passenger_car`.
- **Wejście:** `audi`, `a4`, rok 2020, bez `variantKey`
- **Wyjście:** `need_variant` z `komplet-5szt` i `kierowca`; brak `amount`

### quote-veh-003 — Pusty variantKey jak brak

- **Kod:** `tests/api/domain/quote-vehicle-price.spec.ts` → `it('treats a blank variantKey as missing')`
- **Krytyczność:** high
- **Logika:** spacje nie są wariantem i nie trafiają do macierzy.
- **Wejście:** Audi A4, `variantKey: '  '`
- **Wyjście:** `need_variant` z dwoma opcjami `passenger_car`

### quote-veh-004 — Wiele szablonów → many, bez kwoty

- **Kod:** `tests/api/domain/quote-vehicle-price.spec.ts` → `it('returns many without a price when brand and model match several templates')`
- **Krytyczność:** high
- **Logika:** Golf 8 bez nadwozia to hatch i kombi; składanie nie wybiera szablonu.
- **Wejście:** `vw`, `golf 8`
- **Wyjście:** `{ status: 'many' }`; brak `amount`

### quote-veh-005 — Brak szablonu → none, bez kwoty

- **Kod:** `tests/api/domain/quote-vehicle-price.spec.ts` → `it('returns none without a price when the slots do not map to a template')`
- **Krytyczność:** high
- **Logika:** alias spoza katalogu nie dostaje wymyślonej ceny.
- **Wejście:** `fiat`, `panda`
- **Wyjście:** `{ status: 'none' }`; brak `amount`

### quote-veh-006 — Wariant spoza kategorii → need_variant

- **Kod:** `tests/api/domain/quote-vehicle-price.spec.ts` → `it('returns need_variant without a price when the variant is off the category')`
- **Krytyczność:** critical
- **Logika:** `unknown_variant` z macierzy wraca jako lista wariantów kategorii, bez kwoty.
- **Wejście:** Audi A4, `variantKey: nie-na-kategorii`
- **Wyjście:** `need_variant` z opcjami `passenger_car`; brak `amount`

### quote-veh-007 — Dwa typy maty → mat_type_required

- **Kod:** `tests/api/domain/quote-vehicle-price.spec.ts` → `it('asks for mat type when the matrix has more than one row')`
- **Krytyczność:** critical
- **Logika:** jeden szablon kategorii `pickup` i wariant z dwoma wierszami macierzy nie wybiera kwoty sam.
- **Wejście:** szablon Audi A4 z kategorią `pickup`, `komplet-5szt`, bez `matType`
- **Wyjście:** `mat_type_required` z `classic` i `3d-with-rims`; brak `amount`

### quote-veh-008 — Wybrany typ maty → kwota

- **Kod:** `tests/api/domain/quote-vehicle-price.spec.ts` → `it('quotes the chosen mat type after mat_type_required')`
- **Krytyczność:** critical
- **Logika:** po dopytaniu `matType` czytany jest jeden wiersz macierzy.
- **Wejście:** ten sam szablon `pickup`, `komplet-5szt`, `matType: 3d-with-rims`
- **Wyjście:** `{ status: 'quoted', amount: 1099, currency: 'PLN' }`

### quote-veh-009 — Wariant na kategorii, brak wiersza macierzy

- **Kod:** `tests/api/domain/quote-vehicle-price.spec.ts` → `it('returns missing_matrix_row without a price when the category has no matrix row')`
- **Krytyczność:** high
- **Logika:** wariant jest na kategorii `minivan`, macierz nie ma wiersza — brak kwoty.
- **Wejście:** szablon Audi A4 z kategorią `minivan`, `komplet-5szt`
- **Wyjście:** `{ status: 'missing_matrix_row' }`; brak `amount`
