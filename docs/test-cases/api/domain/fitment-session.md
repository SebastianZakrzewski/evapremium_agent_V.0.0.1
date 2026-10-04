# Snapshot dopasowania

Kod: `tests/api/domain/fitment-session.spec.ts`  
Wznowienie tury: `tests/api/mastra/intents/prepare-intent-turn.spec.ts`  
Zapis ze sklepu: `tests/api/agent-events/agent-events.spec.ts`

Logika zestawu: dopasowanie filtruje od marki i modelu. Pyta o rok albo
nadwozie tylko wtedy, gdy te pola jeszcze rozdzielają szablony albo wyzerowały
wynik. Krótka odpowiedź uzupełnia dopytywany slot. Nowe pytanie zamyka snapshot.

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

### fitment-006 — Narzędzie zapisuje snapshot w sesji tury

- **Kod:** `tests/api/agent-events/agent-events.spec.ts` → `it('stores brand and model when the cascade leaves several bodies')`
- **Krytyczność:** high
- **Logika:** `resolve-template` w sesji tury zapisuje snapshot, gdy zostają dwa nadwozia.
- **Wejście:** `vw` / `golf 8` w `session-fitment`
- **Wyjście:** snapshot z `Volkswagen` i `Golf(MK8) 8 gen`
