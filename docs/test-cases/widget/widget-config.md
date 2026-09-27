# Widget — obiekt konfiguracji

Kod: `tests/widget/embed/widget-config.test.ts`  
Standard: [docs/test-cases/README.md](../README.md)

Logika zestawu: obiekt widgetu jest interfejsem konfiguracji sklepu. Pole
`showProduct` niesie `productId` i `cardUrl` (HTTPS). Brak tego pola zostawia
sam czat. Widget nie dostaje pól wyglądu karty.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| widget-config-001 | high | `showProduct` jako pole obiektu widgetu |
| widget-config-002 | high | Obiekt widgetu bez karty |
| widget-config-003 | high | Odrzucenie pola `showProduct` bez adresu karty |

### widget-config-001 — `showProduct` jako pole obiektu widgetu

- **Kod:** `tests/widget/embed/widget-config.test.ts` → `it('reads showProduct as a field of the widget object')`
- **Krytyczność:** high
- **Logika:** sklep wypełnia pole `showProduct` na obiekcie widgetu; białe znaki przy id są obcinane.
- **Wejście:** `{ showProduct: { productId: ' audi-a4 ', cardUrl: 'https://shop.example/cards/audi-a4' } }`
- **Wyjście:** ten sam obiekt z obciętym `productId` i kanonicznym `cardUrl`

### widget-config-002 — Obiekt widgetu bez karty

- **Kod:** `tests/widget/embed/widget-config.test.ts` → `it('accepts a widget object without a product card')`
- **Krytyczność:** high
- **Logika:** pole `showProduct` jest opcjonalne; sam czat nie wymaga karty.
- **Wejście:** `{}`
- **Wyjście:** `{}`

### widget-config-003 — Odrzucenie pola `showProduct` bez adresu karty

- **Kod:** `tests/widget/embed/widget-config.test.ts` → `it('rejects a showProduct field that is not a shop card address')`
- **Krytyczność:** high
- **Logika:** puste id, `http` i ścieżka względna nie wskazują karty sklepu.
- **Wejście:** `showProduct` z pustym `productId`; `cardUrl` na `http`; `cardUrl` względny
- **Wyjście:** `null` dla każdego z tych obiektów
