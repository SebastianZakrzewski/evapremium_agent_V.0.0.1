# Snapshot dopasowania

Kod: `tests/api/domain/fitment-session.spec.ts`  
Wznowienie tury: `tests/api/mastra/intents/prepare-intent-turn.spec.ts`  
Zapis ze sklepu: `tests/api/agent-events/agent-events.spec.ts`

Logika zestawu: dopasowanie filtruje od marki i modelu. Pyta o rok albo
nadwozie tylko wtedy, gdy te pola jeszcze rozdzielają szablony albo wyzerowały
wynik. Generację pyta tylko wtedy, gdy podany rocznik wpada w więcej niż jeden
zakres. Krótka odpowiedź uzupełnia dopytywany slot. Nowe pytanie zamyka snapshot.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| fitment-001 | high | `many` z dwoma nadwoziami zapisuje markę i model |
| fitment-002 | high | Literówka nadwozia i alias schodzą do klucza |
| fitment-003 | medium | Jeden szablon nie zostawia snapshotu |
| fitment-004 | high | Wznowienie workflow bez kwalifikatora |
| fitment-007 | high | Krok kaskady wstrzymuje się na nadwoziu |
| fitment-008 | high | Tura akcji uruchamia workflow i nie daje resolve-template |
| fitment-009 | high | Pytanie z autem otwiera kaskadę i trzyma markę na rocznik |
| fitment-005 | medium | Nowe pytanie czyści snapshot |
| fitment-006 | high | Narzędzie zapisuje snapshot w sesji tury |
| fitment-010 | high | Nakładające się roczniki pytają o generację i zostawiają model |
| fitment-011 | high | Jednoznaczny rocznik pomija generację |
| fitment-012 | high | Odpowiedź na markę niesie model i rocznik |
| fitment-013 | high | Odpowiedź na rok niesie nadwozie i zamyka kaskadę |
| fitment-014 | high | Zła generacja zostawia dopasowanie na tym pytaniu |
| fitment-015 | critical | Zły rocznik zostawia dopasowanie i każe dopytać |
| fitment-016 | high | Rocznik poza zakresem wraca do pytania o rok |

### fitment-001 — `many` z dwoma nadwoziami zapisuje markę i model

- **Kod:** `tests/api/domain/fitment-session.spec.ts` → `it('remembers one brand and model when several bodies remain')`
- **Krytyczność:** high
- **Logika:** kilka rekordów tego samego modelu różni się nadwoziem, więc sesja trzyma klucze katalogu.
- **Wejście:** `resolveTemplate` dla `vw` / `golf 8` na fixture
- **Wyjście:** `Volkswagen`, `Golf(MK8) 8 gen`, nadwozia `hatchback` i `wagon`

### fitment-002 — Literówka nadwozia i alias schodzą do klucza

- **Kod:** `tests/api/domain/fitment-session.spec.ts` → `it('maps a short body reply onto a saved body key')`
- **Krytyczność:** high
- **Logika:** odpowiedź klienta jest jednym z zapisanych nadwozi albo aliasem, zanim poleci do filtra.
- **Wejście:** `hatcback`, `kombi` przy snapshotcie Golfa VIII
- **Wyjście:** `hatchback`, `wagon`

### fitment-003 — Jeden szablon nie zostawia snapshotu

- **Kod:** `tests/api/domain/fitment-session.spec.ts` → `it('does not keep a snapshot when the cascade is one template')`
- **Krytyczność:** medium
- **Logika:** status `one` nie ma czego dopytywać.
- **Wejście:** `vw` / `golf 8` / `kombi`
- **Wyjście:** brak snapshotu

### fitment-004 — Wznowienie workflow bez kwalifikatora

- **Kod:** `tests/api/mastra/intents/prepare-intent-turn.spec.ts` → `it('resumes a saved fitment with the body reply and does not requalify')`
- **Krytyczność:** high
- **Logika:** krótka odpowiedź wznawia krok kaskady. Wynik `one` trafia do noty tury.
- **Wejście:** snapshot `waiting_for_body` dla Golfa, wiadomość `hatcback`
- **Wyjście:** `Kaskada: one`, `body=hatchback`, `verifiedProduct` z `recordKey` hatchbacka Golfa, kwalifikator nie jest wołany

### fitment-007 — Krok kaskady wstrzymuje się na nadwoziu

- **Kod:** `tests/api/domain/fitment-session.spec.ts` → `it('resolves one template once the remaining body is known')`
- **Krytyczność:** high
- **Logika:** pierwszy strzał `vw` / `golf 8` zostawia dwa nadwozia; `hatcback` domyka do hatchbacka.
- **Wejście:** fixture kaskady, potem `hatcback`
- **Wyjście:** `suspended`, potem `ready` / `one` / `hatchback`

### fitment-008 — Tura akcji uruchamia workflow i nie daje resolve-template

- **Kod:** `tests/api/mastra/intents/prepare-intent-turn.spec.ts` → `it('runs the cascade workflow for a fitment action and suspends on body')`
- **Krytyczność:** high
- **Logika:** kompletna akcja dopasowania woła filtr w workflow i czeka na nadwozie.
- **Wejście:** `Chcę dopasować dywaniki do VW Golf 8` na fixture
- **Wyjście:** `workflow: fitment_cascade`, puste toole, nota `Brakuje typu nadwozia` z `hatchback` i `wagon`

### fitment-009 — Pytanie z autem otwiera kaskadę i trzyma markę na rocznik

- **Kod:** `tests/api/mastra/intents/prepare-intent-turn.spec.ts` → `it('keeps brand and model from a knowledge fitment when the year arrives next')`
- **Krytyczność:** high
- **Logika:** pytanie z marką i modelem, nawet przy `mode: knowledge`, otwiera workflow. Krótki rocznik dopisuje rok bez nowej kwalifikacji.
- **Wejście:** encje `BMW` / `X5`, `mode: knowledge`, potem wiadomość `2021 rok`
- **Wyjście:** pierwsza tura `fitment_cascade` bez tooli, brakuje rocznika; po odpowiedzi snapshot ma rok 2021 i brakuje typu nadwozia

### fitment-005 — Nowe pytanie czyści snapshot

- **Kod:** `tests/api/mastra/intents/prepare-intent-turn.spec.ts` → `it('drops a saved fitment when the next message is a new question')`
- **Krytyczność:** medium
- **Logika:** pytanie zamyka czekanie na nadwozie.
- **Wejście:** snapshot Golfa, wiadomość `Jakie macie kolory?`
- **Wyjście:** `clearFitment: true`

### fitment-010 — Nakładające się roczniki pytają o generację i zostawiają model

- **Kod:** `tests/api/domain/fitment-session.spec.ts` → `it('asks for generation when the year overlaps two ranges and keeps the model')`, `it('keeps the model when the generation reply is an ordinal')`
- **Krytyczność:** high
- **Logika:** rok 2019 jest i w Golfie VII, i w Golfie VIII. Workflow pyta o generację, nie podmienia modelu. „siódma” zostawia model i przechodzi do nadwozia.
- **Wejście:** `vw` / `golf` / `2019`, potem `siódma`
- **Wyjście:** brakuje `generation`, opcje `7 gen` i `8 gen`, sloty z modelem `golf` i rokiem `2019`; po odpowiedzi brakuje `body_type`

### fitment-011 — Jednoznaczny rocznik pomija generację

- **Kod:** `tests/api/domain/fitment-session.spec.ts` → `it('skips generation when the year matches a single range')`
- **Krytyczność:** high
- **Logika:** rok 2021 mieści się tylko w Golfie VIII, więc pytanie dotyczy nadwozia.
- **Wejście:** `vw` / `golf` / `2021`
- **Wyjście:** brakuje `body_type`, brak pola generacji

### fitment-012 — Odpowiedź na markę niesie model i rocznik

- **Kod:** `tests/api/domain/fitment-session.spec.ts` → `it('takes brand, model and year from the reply that was asked as a brand')`
- **Krytyczność:** high
- **Logika:** krótka odpowiedź na markę rozcina znany alias marki i zostawia resztę jako model. Rocznik z tego samego zdania nie wraca do marki.
- **Wejście:** brak slotów, pytanie o `car_brand`, wiadomość `vw golf 8 2019`
- **Wyjście:** sloty `vw` / `golf 8` / `2019`, brakuje `body_type`

### fitment-013 — Odpowiedź na rok niesie nadwozie i zamyka kaskadę

- **Kod:** `tests/api/domain/fitment-session.spec.ts` → `it('resolves the body given together with the year it asked for')`
- **Krytyczność:** high
- **Logika:** przy pytaniu o rok zdanie z rokiem i nadwoziem uzupełnia oba sloty i schodzi do jednego szablonu.
- **Wejście:** `vw` / `golf 8`, pytanie o rok, wiadomość `2019 kombi`
- **Wyjście:** `status: ready`, szablon `tmpl-golf-mk8-wagon`

### fitment-014 — Zła generacja zostawia dopasowanie na tym pytaniu

- **Kod:** `tests/api/domain/fitment-session.spec.ts` → `it('reports a generation that matches none of the templates')`
- **Krytyczność:** high
- **Logika:** generacja spoza szablonów rocznika nie kasuje marki, modelu ani roku. Kaskada zostaje na pytaniu o generację i niesie brak podanej wartości.
- **Wejście:** `vw` / `golf` / `2019` / generacja `4 gen`
- **Wyjście:** `suspended`, brakuje `generation`, opcje `7 gen` i `8 gen`, sloty bez generacji, brak `generation=4 gen`

### fitment-016 — Rocznik poza zakresem wraca do pytania o rok

- **Kod:** `tests/api/domain/fitment-session.spec.ts` → `it('reports a year that matches nothing for the variant')`
- **Krytyczność:** high
- **Logika:** rok poza zakresem modelu czyści tylko ten slot. Marka i model zostają, a pytanie wraca do rocznika z zakresami katalogu.
- **Wejście:** `vw` / `golf 8` / `2005`
- **Wyjście:** `suspended`, brakuje `year`, opcja `2019+`, sloty `vw` / `golf 8`, brak `year=2005`

### fitment-015 — Zły rocznik zostawia dopasowanie i każe dopytać

- **Kod:** `tests/api/mastra/intents/prepare-intent-turn.spec.ts` → `it('tells the model when the given year is absent for the variant')`
- **Krytyczność:** critical
- **Logika:** nota mówi o braku rocznika i każe zapytać o niego ponownie. Workflow dopasowania zostaje otwarty na tym slocie.
- **Wejście:** snapshot `vw` / `golf 8`, wiadomość `1990`
- **Wyjście:** `fitment.missing = year`, sloty bez roku, nota zawiera brak rocznika 1990, `Brakuje rocznika.` i `2019+`

### fitment-006 — Narzędzie zapisuje snapshot w sesji tury

- **Kod:** `tests/api/agent-events/agent-events.spec.ts` → `it('stores brand and model when the cascade leaves several bodies')`
- **Krytyczność:** high
- **Logika:** `resolve-template` w sesji tury zapisuje snapshot, gdy zostają dwa nadwozia.
- **Wejście:** `vw` / `golf 8` w `session-fitment`
- **Wyjście:** snapshot z `Volkswagen` i `Golf(MK8) 8 gen`
