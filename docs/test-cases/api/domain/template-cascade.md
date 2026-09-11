# Kaskada szablonu (domena)

Kod: `api/src/domain/template-cascade.spec.ts`  
Fixture: `api/src/templates/in-memory/cascade-fixture.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: surowe sloty → normalizacja → alias → jeden filtr
`mat_templates` → `none` / `one` / `many`. LLM nie uczestniczy.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| cascade-001 | medium | Normalizacja slotów |
| cascade-002 | medium | Mapowanie aliasów |
| cascade-003 | critical | Pełne sloty → jeden szablon |
| cascade-004 | critical | Brak aliasu → none |
| cascade-005 | high | Sama marka → many |
| cascade-006 | high | Nadwozie schodzi z N do 1 |
| cascade-007 | high | Rok schodzi z N do 1 |
| cascade-008 | high | `record_key` bez reszty slotów |
| cascade-009 | critical | Niezmapowany slot nie wymyśla klucza |

### cascade-001 — Normalizacja slotów

- **Kod:** `api/src/domain/template-cascade.spec.ts` → `it('normalizes raw slots without inventing keys')`
- **Krytyczność:** medium
- **Logika:** tekst klienta jest ujednolicany (trim, lowercase, spacje); funkcja nie wymyśla `brand_key` / `model_key`.
- **Wejście:** `{ brand: '  VW ', model: 'Golf   8', bodyType: 'Kombi', year: 2021 }`
- **Wyjście:** `{ brand: 'vw', model: 'golf 8', bodyType: 'kombi', year: 2021, recordKey: undefined }`

### cascade-002 — Mapowanie aliasów

- **Kod:** `api/src/domain/template-cascade.spec.ts` → `it('maps aliases to canonical mat_templates keys')`
- **Krytyczność:** medium
- **Logika:** alias musi trafić w kanoniczny klucz jak w `mat_templates` (Excel), nie w ładny slug.
- **Wejście:** znormalizowane `{ brand: 'vw', model: 'golf 8', bodyType: 'kombi' }` + `CASCADE_ALIASES`
- **Wyjście:** `{ brandKey: 'Volkswagen', modelKey: 'Golf(MK8) 8 gen', bodyTypeKey: 'wagon' }`

### cascade-003 — Pełne sloty → jeden szablon

- **Kod:** `api/src/domain/template-cascade.spec.ts` → `it('resolves full slots to one template')`
- **Krytyczność:** critical
- **Logika:** jednoznaczny szablon jest jedyną podstawą późniejszej wyceny; wynik niesie `dealerPricingCategoryKey`.
- **Wejście:** `{ brand: 'vw', model: 'Golf 8', bodyType: 'kombi', year: 2021 }` + fixture
- **Wyjście:** `{ status: 'one', template.id: 'tmpl-golf-mk8-wagon', dealerPricingCategoryKey: 'passenger_car' }`

### cascade-004 — Brak aliasu → none

- **Kod:** `api/src/domain/template-cascade.spec.ts` → `it('returns none when the only slot has no alias')`
- **Krytyczność:** critical
- **Logika:** nieznane auto nie dostaje szablonu ani ceny; 0 rekordów, bez zgadywania.
- **Wejście:** `{ brand: 'nieznana-marka' }`
- **Wyjście:** `{ status: 'none' }`

### cascade-005 — Sama marka → many

- **Kod:** `api/src/domain/template-cascade.spec.ts` → `it('returns many when only brand is known')`
- **Krytyczność:** high
- **Logika:** wiele szablonów = lista, bez ceny, aż do jednego rekordu. Nieaktywne wiersze odpadają.
- **Wejście:** `{ brand: 'volkswagen' }`
- **Wyjście:** `{ status: 'many' }` z czterema id Golf MK7/MK8 (hatch + wagon); bez `tmpl-golf-inactive`

### cascade-006 — Nadwozie schodzi z N do 1

- **Kod:** `api/src/domain/template-cascade.spec.ts` → `it('narrows many body variants to one with body type')`
- **Krytyczność:** high
- **Logika:** filtr nadwozia (`body_type_key` lub `_1`/`_2`/`_3`) ma domknąć kaskadę do jednego wiersza.
- **Wejście:** `{ brand: 'vw', model: 'golf 8', bodyType: 'hatch' }`
- **Wyjście:** `{ status: 'one', template.id: 'tmpl-golf-mk8-hatch' }`

### cascade-007 — Rok schodzi z N do 1

- **Kod:** `api/src/domain/template-cascade.spec.ts` → `it('narrows generations to one with year')`
- **Krytyczność:** high
- **Logika:** rok w zakresie `year_from` … `year_to` / `is_open_ended` wybiera generację, nie „podobne auto”.
- **Wejście:** `{ brand: 'vw', model: 'golf 7', bodyType: 'hatch', year: 2015 }`
- **Wyjście:** `{ status: 'one', template.id: 'tmpl-golf-mk7-hatch' }`

### cascade-008 — `record_key` bez reszty slotów

- **Kod:** `api/src/domain/template-cascade.spec.ts` → `it('resolves an exact record_key without other slots')`
- **Krytyczność:** high
- **Logika:** znany `record_key` to celny strzał; nie wymaga marki/modelu w wejściu.
- **Wejście:** `{ recordKey: 'passenger_car|audi|a4|2015-2023|sedan|5' }`
- **Wyjście:** `{ status: 'one', template.id: 'tmpl-audi-a4-sedan' }`

### cascade-009 — Niezmapowany slot nie wymyśla klucza

- **Kod:** `api/src/domain/template-cascade.spec.ts` → `it('ignores an unmapped extra slot instead of inventing a key')`
- **Krytyczność:** critical
- **Logika:** brak aliasu = slot poza filtrem; system nie dopasowuje „na podobieństwo”.
- **Wejście:** `{ brand: 'vw', model: 'golf-xyz' }` vs `{ brand: 'vw' }`
- **Wyjście:** oba wyniki identyczne, `status: 'many'`
