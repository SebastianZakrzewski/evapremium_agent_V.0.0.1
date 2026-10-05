# Kaskada szablonu (domena)

Kod: `tests/api/domain/template-cascade.spec.ts`  
Fixture: `tests/api/templates/in-memory/cascade-fixture.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: surowe sloty → normalizacja → alias albo klasyfikacja kluczy
→ jeden filtr `mat_templates` → zwinięcie zdublowanych wierszy tego samego auta → `none` / `one` / `many`. Klasyfikacja dostaje
listę kluczy z katalogu i stub w teście; filtr nadal nie ufa kluczowi spoza listy.

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
| cascade-010 | high | Literówka marki i modelu → szablony tej generacji |
| cascade-011 | high | Alias nadwozia schodzi z N do 1 po klasyfikacji |
| cascade-012 | critical | Klucz spoza listy kandydatów odpada |
| cascade-013 | high | Brak marki → none, bez wywołania klasyfikatora |
| cascade-014 | high | Kilka generacji z klasyfikatora → many |
| cascade-015 | medium | Shortlista modeli jednej marki |
| cascade-016 | high | Marka ze spacją na końcu klucza |
| cascade-017 | high | Dwa klucze po trim → none |
| cascade-018 | critical | Zdublowany wiersz tego samego auta → one |
| cascade-019 | high | Duplikat nie chowa innego nadwozia |
| cascade-020 | high | Spacje i wielkość liter w modelu nie dają many |

### cascade-001 — Normalizacja slotów

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('normalizes raw slots without inventing keys')`
- **Krytyczność:** medium
- **Logika:** tekst klienta jest ujednolicany (trim, lowercase, spacje); funkcja nie wymyśla `brand_key` / `model_key`.
- **Wejście:** `{ brand: '  VW ', model: 'Golf   8', bodyType: 'Kombi', year: 2021 }`
- **Wyjście:** `{ brand: 'vw', model: 'golf 8', bodyType: 'kombi', year: 2021, recordKey: undefined }`

### cascade-002 — Mapowanie aliasów

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('maps aliases to canonical mat_templates keys')`
- **Krytyczność:** medium
- **Logika:** alias musi trafić w kanoniczny klucz jak w `mat_templates` (Excel), nie w ładny slug.
- **Wejście:** znormalizowane `{ brand: 'vw', model: 'golf 8', bodyType: 'kombi' }` + `CASCADE_ALIASES`
- **Wyjście:** `{ brandKey: 'Volkswagen', modelKey: 'Golf(MK8) 8 gen', bodyTypeKey: 'wagon' }`

### cascade-003 — Pełne sloty → jeden szablon

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('resolves full slots to one template')`
- **Krytyczność:** critical
- **Logika:** jednoznaczny szablon jest jedyną podstawą późniejszej wyceny; wynik niesie `dealerPricingCategoryKey`.
- **Wejście:** `{ brand: 'vw', model: 'Golf 8', bodyType: 'kombi', year: 2021 }` + fixture
- **Wyjście:** `{ status: 'one', template.id: 'tmpl-golf-mk8-wagon', dealerPricingCategoryKey: 'passenger_car' }`

### cascade-004 — Brak aliasu → none

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('returns none when the only slot has no alias')`
- **Krytyczność:** critical
- **Logika:** nieznane auto nie dostaje szablonu ani ceny; 0 rekordów, bez zgadywania.
- **Wejście:** `{ brand: 'nieznana-marka' }`
- **Wyjście:** `{ status: 'none' }`

### cascade-005 — Sama marka → many

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('returns many when only brand is known')`
- **Krytyczność:** high
- **Logika:** wiele szablonów = lista, bez ceny, aż do jednego rekordu. Nieaktywne wiersze odpadają.
- **Wejście:** `{ brand: 'volkswagen' }`
- **Wyjście:** `{ status: 'many' }` z czterema id Golf MK7/MK8 (hatch + wagon); bez `tmpl-golf-inactive`

### cascade-006 — Nadwozie schodzi z N do 1

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('narrows many body variants to one with body type')`
- **Krytyczność:** high
- **Logika:** filtr nadwozia (`body_type_key` lub `_1`/`_2`/`_3`) ma domknąć kaskadę do jednego wiersza.
- **Wejście:** `{ brand: 'vw', model: 'golf 8', bodyType: 'hatch' }`
- **Wyjście:** `{ status: 'one', template.id: 'tmpl-golf-mk8-hatch' }`

### cascade-007 — Rok schodzi z N do 1

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('narrows generations to one with year')`
- **Krytyczność:** high
- **Logika:** rok w zakresie `year_from` … `year_to` / `is_open_ended` wybiera generację, nie „podobne auto”.
- **Wejście:** `{ brand: 'vw', model: 'golf 7', bodyType: 'hatch', year: 2015 }`
- **Wyjście:** `{ status: 'one', template.id: 'tmpl-golf-mk7-hatch' }`

### cascade-008 — `record_key` bez reszty slotów

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('resolves an exact record_key without other slots')`
- **Krytyczność:** high
- **Logika:** znany `record_key` to celny strzał; nie wymaga marki/modelu w wejściu.
- **Wejście:** `{ recordKey: 'passenger_car|audi|a4|2015-2023|sedan|5' }`
- **Wyjście:** `{ status: 'one', template.id: 'tmpl-audi-a4-sedan' }`

### cascade-009 — Niezmapowany slot nie wymyśla klucza

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('ignores an unmapped extra slot instead of inventing a key')`
- **Krytyczność:** critical
- **Logika:** brak aliasu = slot poza filtrem; system nie dopasowuje „na podobieństwo”.
- **Wejście:** `{ brand: 'vw', model: 'golf-xyz' }` vs `{ brand: 'vw' }`
- **Wyjście:** oba wyniki identyczne, `status: 'many'`

### cascade-010 — Literówka marki i modelu → szablony tej generacji

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('resolves a misspelled brand and model to the matching templates')`
- **Krytyczność:** high
- **Logika:** klasyfikator oddaje klucze katalogu; filtr zostawia aktywne szablony tej pary, bez zgadywania rekordu.
- **Wejście:** `{ brand: 'Volwagen', model: 'golf 8' }`, stub `Volkswagen` + `Golf(MK8) 8 gen`
- **Wyjście:** `status: 'many'`, id `tmpl-golf-mk8-hatch` i `tmpl-golf-mk8-wagon`

### cascade-011 — Alias nadwozia schodzi z N do 1 po klasyfikacji

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('narrows classified keys with the body alias')`
- **Krytyczność:** high
- **Logika:** nadwozie zostaje przy aliasie; po kluczach klasyfikatora `kombi` zostawia wagon.
- **Wejście:** `{ brand: 'Volwagen', model: 'golf 8', bodyType: 'kombi' }`, te same klucze co cascade-010
- **Wyjście:** `status: 'one'`, `template.id: 'tmpl-golf-mk8-wagon'`

### cascade-012 — Klucz spoza listy kandydatów odpada

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('drops a model key that was not on the candidate list')`
- **Krytyczność:** critical
- **Logika:** klucz, którego nie ma wśród kandydatów marki, nie wchodzi do filtra.
- **Wejście:** stub modeli `Golf(MK8) 8 gen` i `Nope`
- **Wyjście:** te same dwa szablony MK8 co cascade-010, bez obcego klucza

### cascade-013 — Brak marki → none, bez wywołania klasyfikatora

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('returns none when brand is missing and does not ask the classifier')`
- **Krytyczność:** high
- **Logika:** pusta marka kończy kaskadę zanim poleci zapytanie do modelu.
- **Wejście:** `{ model: 'golf 8' }`, klasyfikator rzuca, gdy zostanie wywołany
- **Wyjście:** `{ status: 'none' }`

### cascade-014 — Kilka generacji z klasyfikatora → many

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('keeps every generation the classifier returns')`
- **Krytyczność:** high
- **Logika:** brak jednej generacji w słowach klienta zostawia wszystkie klucze oddane przez klasyfikator.
- **Wejście:** `{ brand: 'vw', model: 'golf' }`, stub `Golf(MK7) 7 gen` i `Golf(MK8) 8 gen`
- **Wyjście:** `status: 'many'`, cztery aktywne szablony Golf MK7 i MK8

### cascade-015 — Shortlista modeli jednej marki

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('shortlists the closest model keys for one brand')`
- **Krytyczność:** medium
- **Logika:** do klasyfikatora modelu idzie co najwyżej 12 kluczy wybranej marki, najbliższych słowom klienta.
- **Wejście:** szablony Volkswagena plus 12 kluczy `zz-*`, zapytanie `golf 8`
- **Wyjście:** 12 kluczy, w tym `Golf(MK8) 8 gen`, bez `A4`

### cascade-016 — Marka ze spacją na końcu klucza

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('accepts a trimmed brand when the catalog key has one trailing space')`
- **Krytyczność:** high
- **Logika:** gdy po `trim` zostaje dokładnie jeden `brand_key`, filtr używa napisu z katalogu, nie napisu z modelu.
- **Wejście:** szablon `brandKey: 'Toyota '`, stub marki `Toyota` i modelu `RAV4`
- **Wyjście:** `status: 'one'`, `template.id: 'tmpl-spaced'`

### cascade-017 — Dwa klucze po trim → none

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('returns none when trim matches two brand keys')`
- **Krytyczność:** high
- **Logika:** dwa klucze, które po obcięciu spacji są tym samym napisem, nie są wybierane.
- **Wejście:** `Citroen` i `Citroen `, stub marki ` Citroen`
- **Wyjście:** `{ status: 'none' }`

### cascade-018 — Zdublowany wiersz tego samego auta → one

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('collapses duplicate rows of the same vehicle to one template')`
- **Krytyczność:** critical
- **Logika:** dwa wiersze o tej samej marce, modelu, latach, nadwoziu i kategorii cennika to jeden szablon. Zostaje rekord o mniejszym `record_key`. Różne `id` i numer wiersza Excela nie dają `many`.
- **Wejście:** dwa szablony Golf MK8 kombi, `record_key` `…|wagon|9` i `…|wagon|2`, sloty `{ brand: 'vw', model: 'Golf 8', bodyType: 'kombi', year: 2021 }`
- **Wyjście:** `{ status: 'one', template.id: 'tmpl-golf-mk8-wagon' }`

### cascade-019 — Duplikat nie chowa innego nadwozia

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('keeps distinct vehicles when only one of them is duplicated')`
- **Krytyczność:** high
- **Logika:** zwijane są tylko kopie tego samego auta. Inne nadwozie zostaje osobnym szablonem.
- **Wejście:** dwa wiersze Golf MK8 hatchback i jeden kombi, sloty `{ brand: 'vw', model: 'golf 8' }`
- **Wyjście:** `status: 'many'`, id `tmpl-golf-mk8-hatch` i `tmpl-golf-mk8-wagon`

### cascade-020 — Spacje i wielkość liter w modelu nie dają many

- **Kod:** `tests/api/domain/template-cascade.spec.ts` → `it('collapses model keys that differ only by spaces and letter case')`
- **Krytyczność:** high
- **Logika:** przed `one` albo `many` marka i model są porównywane bez białych znaków i małymi literami. Inna generacja zostaje osobnym szablonem.
- **Wejście:** `Rav4 (XA30) 3 gen` i `Rav 4 (XA30) 3 gen`, rok 2005, SUV; osobno `Rav4 (XA20) 2 gen` z `Rav4 (XA30) 3 gen`
- **Wyjście:** pierwsza para `one` z rekordem `rav4_xa30_3_gen`; para generacji `many`
