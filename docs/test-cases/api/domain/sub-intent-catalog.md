# Katalog sub-intencji

Kod: `tests/api/domain/sub-intent-catalog.spec.ts`

Logika zestawu: sub-intencja jest obiektem pod obecnym `ShopIntent`, a wycena
bez slotów ma workflow, nie tool zamówienia.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| subintent-001 | high | Slugi i rodzice |
| subintent-002 | high | Wycena wymaga marki i modelu |

### subintent-001 — Slugi i rodzice

- **Kod:** `tests/api/domain/sub-intent-catalog.spec.ts` → `it('keeps shop sub-intents under the current parent intents')`
- **Krytyczność:** high
- **Logika:** Katalog nie wprowadza zamówień ani konta. Każdy slug ma opis i rodzica z czterech intencji sklepu.
- **Wejście:** `SUB_INTENT_CATALOG`
- **Wyjście:** slugi `available_colors`, `material`, `fitment`, `delivery_info`, `indicative_quote`, `complaint_info`, `contact_request`

### subintent-002 — Wycena wymaga marki i modelu

- **Kod:** `tests/api/domain/sub-intent-catalog.spec.ts` → `it('sends an incomplete indicative quote to the vehicle workflow')`
- **Krytyczność:** high
- **Logika:** Bez marki, modelu, roku i typu nadwozia bezpośredni tool nie rusza; fallback to `quote_vehicle`.
- **Wejście:** slug `indicative_quote`
- **Wyjście:** `directTool` `quote-vehicle`, allowlista `quote-vehicle` i `collect-contact`, `requiredInputs` marka, model, rok i nadwozie, `fallbackWorkflow` `quote_vehicle`
