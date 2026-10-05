# Workflow slotów wyceny

Kod: `tests/api/domain/quote-vehicle.spec.ts`

Logika zestawu: brak marki, modelu, roku albo typu nadwozia wstrzymuje proces;
krótka odpowiedź wznawia go bez nowej kwalifikacji; pytanie klienta zamyka workflow.
Krok Mastry `quote-vehicle` woła `collectVehicleStep` i `suspend` — Jest
nie ładuje modułu workflow Mastry (ten sam powód co `createIntentWorkflow`).

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| quote-wf-001 | high | Suspend do kompletu slotów |
| quote-wf-002 | high | Resume bez kwalifikatora |
| quote-wf-003 | medium | Nowe pytanie zamyka workflow |
| quote-wf-004 | high | Payload suspend i gotowy wynik kroku |
| quote-wf-005 | high | Rok i nadwozie w jednej odpowiedzi |
| quote-wf-006 | high | Marka, model i rocznik w odpowiedzi na markę |
| quote-wf-007 | high | Nadmiarowe pola w odpowiedzi na rok albo generację |
| quote-wf-008 | high | Krawędzie odpowiedzi nie nadpisują zebranych slotów |

### quote-wf-001 — Suspend do kompletu slotów

- **Kod:** `tests/api/domain/quote-vehicle.spec.ts` → `it('suspends until brand and model arrive, then points at quote-vehicle')`
- **Krytyczność:** high
- **Logika:** Najpierw marka, potem model. Po komplecie tool to `quote-vehicle`.
- **Wejście:** puste encje, potem `Volkswagen`, potem `Golf 8`
- **Wyjście:** `waiting_for_vehicle`, na końcu `status: ready`

### quote-wf-002 — Resume bez kwalifikatora

- **Kod:** `tests/api/domain/quote-vehicle.spec.ts` → `it('resumes the open workflow without a new qualification')`
- **Krytyczność:** high
- **Logika:** Aktywny workflow nie traktuje krótkiej odpowiedzi jako nowego zapytania.
- **Wejście:** `Ile kosztują dywaniki?`, potem `Volkswagen`, potem `Golf 8`
- **Wyjście:** kwalifikator wołany raz; trzecia tura ma `quote-vehicle`

### quote-wf-003 — Nowe pytanie zamyka workflow

- **Kod:** `tests/api/domain/quote-vehicle.spec.ts` → `it('drops the workflow when the next message is a new question')`
- **Krytyczność:** medium
- **Logika:** Pytanie ze znakiem zapytania nie jest odpowiedzią na brakujący slot.
- **Wejście:** otwarty workflow, `Jaki jest termin dostawy?`
- **Wyjście:** `intent: delivery`, brak `quoteWorkflow`

### quote-wf-004 — Payload suspend i gotowy wynik kroku

- **Kod:** `tests/api/domain/quote-vehicle.spec.ts` → `it('builds the Mastra suspend payload and the ready output')`
- **Krytyczność:** high
- **Logika:** Krok Mastry przekazuje ten payload do `suspend` albo zwraca gotowość z `quote-vehicle`.
- **Wejście:** puste encje; potem `car_brand: Volkswagen` i wiadomość `Golf 8`
- **Wyjście:** `action: suspend` / `waiting_for_vehicle`; potem `action: complete` z tool `quote-vehicle`

### quote-wf-006 — Marka, model i rocznik w odpowiedzi na markę

- **Kod:** `tests/api/domain/quote-vehicle.spec.ts` → `it('splits brand, model and year from one reply while the brand is missing')`
- **Krytyczność:** high
- **Logika:** gdy brakuje marki, najdłuższy alias marki jest odcinany z przodu, a reszta idzie do modelu. Rok i nadwozie z tej samej odpowiedzi trafiają do swoich slotów. Sama marka wielowyrazowa zostaje marką.
- **Wejście:** `toyota rav4 2019`; `Land Rover Discovery 2018`; `Land Rover`; `toyota rav4 2019 suv`
- **Wyjście:** `toyota` / `rav4` / `2019` i brak nadwozia; `Land Rover` / `Discovery` / `2018` i brak nadwozia; sama marka `Land Rover` i brak modelu; komplet czterech slotów, gdy w zdaniu jest też `suv`

### quote-wf-007 — Nadmiarowe pola w odpowiedzi na rok albo generację

- **Kod:** `tests/api/domain/quote-vehicle.spec.ts` → `it('keeps model and body given while the year is the question')`, `it('keeps a body given with the generation and leaves the model')`
- **Krytyczność:** high
- **Logika:** pytanie dotyczy jednego slotu, ale puste sloty z tej samej odpowiedzi też się uzupełniają. Generacja nie podmienia modelu.
- **Wejście:** marka `toyota`, pytanie o rok, `rav4 2019 suv`; model `golf`, pytanie o generację, `siódma kombi`
- **Wyjście:** komplet `toyota` / `rav4` / `2019` / `suv`; model zostaje `golf`, dochodzą `kombi` i generacja `siódma`

### quote-wf-008 — Krawędzie odpowiedzi nie nadpisują zebranych slotów

- **Kod:** `tests/api/domain/quote-vehicle.spec.ts` → `it('covers reply edges without clobbering slots already stored')`
- **Krytyczność:** high
- **Logika:** przecinek nie skleja marki z modelem. Powtórzony alias marki schodzi ze zdania. Zapisany model i rok zostają. Literówka nadwozia schodzi do aliasu. Generacja nie zjada modelu. Rok spoza 1980–2039 nie wchodzi do modelu. Drugi rok w zdaniu nie podmienia modelu. Pytanie nie jest odpowiedzią na slot.
- **Wejście:** `rav4 toyota, 2019 suv`; `vw golf 8 2020 kombi` przy marce Volkswagen; `2021 Golf 8` przy roku 2019 i modelu RAV4; `hatcback`; `8 gen`; `1979 rav4`; `2015 albo 2019`; pytanie o dostawę
- **Wyjście:** marka, model, rok i nadwozie z pierwszego zdania; model `golf 8` bez `vw`; model RAV4 i rok 2019 bez zmian; nadwozie `hatchback`; generacja `8 gen`; model `rav4` bez roku 1979; rok 2015 i model `rav4`; sloty bez zmian po pytaniu

### quote-wf-005 — Rok i nadwozie w jednej odpowiedzi

- **Kod:** `tests/api/domain/quote-vehicle.spec.ts` → `it('keeps the body given in the same reply as the year')`
- **Krytyczność:** high
- **Logika:** gdy brakuje roku, zdanie z rokiem i nadwoziem uzupełnia oba sloty.
- **Wejście:** sloty Toyota i RAV4, wiadomość `2021 rok SUV`
- **Wyjście:** brak brakującego slotu, `year=2021`, `body_type=suv`

