# Fallback intencji i lead

Kod: `tests/api/mastra/intents/intent-fallback.spec.ts`

Logika zestawu: niska pewność (reclassify, potem `out_of_scope`) i brak
profilu → zero shop-tooli; `general_agent` zakazany; lead tylko Nest
(`createLead`, kontakt + zgoda), nie tool Mastry.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| fallback-001 | high | Niska pewność dwukrotnie → out_of_scope, tools [] |
| fallback-002 | medium | Reclassify z wysoką pewnością zostaje przy pricing |
| fallback-003 | high | Brak profilu / general_agent → out_of_scope |
| fallback-004 | high | Błąd kwalifikatora → out_of_scope |
| fallback-005 | critical | Brak toola leada; bez zgody brak crm.lead.add |

### fallback-001 — Niska pewność dwukrotnie → out_of_scope, tools []

- **Kod:** `tests/api/mastra/intents/intent-fallback.spec.ts` → `it('uses out_of_scope and zero shop tools when confidence stays low')`
- **Krytyczność:** high
- **Logika:** `onLowConfidence: reclassify`; drugi wynik poniżej progu nie otwiera shop-tooli.
- **Wejście:** dwa wyniki `pricing` z `confidence` 0.1 i 0.2
- **Wyjście:** `intent: out_of_scope`, `toolIds: []`

### fallback-002 — Reclassify z wysoką pewnością zostaje przy pricing

- **Kod:** `tests/api/mastra/intents/intent-fallback.spec.ts` → `it('keeps pricing when reclassify raises confidence')`
- **Krytyczność:** medium
- **Logika:** Jedno ponowne qualify może odzyskać gałąź wyceny.
- **Wejście:** 0.1 potem 0.9, intent `pricing`
- **Wyjście:** tura `pricing` z `quote-vehicle`

### fallback-003 — Brak profilu / general_agent → out_of_scope

- **Kod:** `tests/api/mastra/intents/intent-fallback.spec.ts` → `it('maps a missing profile to out_of_scope with no shop tools')`
- **Krytyczność:** high
- **Logika:** Nieznany intent nie jest `general_agent` ze wszystkimi toolami.
- **Wejście:** `'general_agent'`
- **Wyjście:** profil `out_of_scope`, `tools: []`

### fallback-004 — Błąd kwalifikatora → out_of_scope

- **Kod:** `tests/api/mastra/intents/intent-fallback.spec.ts` → `it('maps a thrown qualifier to out_of_scope')`
- **Krytyczność:** high
- **Logika:** `onUnknownCase: out_of_scope` przy wyjątku Zod / generate.
- **Wejście:** qualify rzuca
- **Wyjście:** `out_of_scope`, `toolIds: []`

### fallback-005 — Brak toola leada; bez zgody brak crm.lead.add

- **Kod:** `tests/api/mastra/intents/intent-fallback.spec.ts` → `it('does not put Bitrix lead on Mastra tools; Nest still requires consent')`
- **Krytyczność:** critical
- **Logika:** Lead nie jest id w `SHOP_TOOL_IDS` ani na turze `out_of_scope`; bramka zostaje `createLead`.
- **Wejście:** tura `out_of_scope`; `createLead` z `consent: false`
- **Wyjście:** `toolIds: []`; `{ status: 'skipped_no_consent' }`; zero wywołań Bitrix
