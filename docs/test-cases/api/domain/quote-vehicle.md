# Workflow slotów wyceny

Kod: `tests/api/domain/quote-vehicle.spec.ts`

Logika zestawu: brak marki lub modelu wstrzymuje proces; krótka odpowiedź
wznawia go bez nowej kwalifikacji; pytanie klienta zamyka workflow.
Krok Mastry `quote-vehicle` woła `collectVehicleStep` i `suspend` — Jest
nie ładuje modułu workflow Mastry (ten sam powód co `createIntentWorkflow`).

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| quote-wf-001 | high | Suspend do kompletu slotów |
| quote-wf-002 | high | Resume bez kwalifikatora |
| quote-wf-003 | medium | Nowe pytanie zamyka workflow |
| quote-wf-004 | high | Payload suspend i gotowy wynik kroku |

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
