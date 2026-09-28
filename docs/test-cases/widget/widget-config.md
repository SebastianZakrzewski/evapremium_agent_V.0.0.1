# Widget — obiekt konfiguracji

Kod: `tests/widget/embed/widget-config.test.ts`  
Standard: [docs/test-cases/README.md](../README.md)

Logika zestawu: obiekt widgetu jest interfejsem konfiguracji sklepu. Pole
`showProduct` niesie `productId` i `cardUrl` (HTTPS). `mountObject` przyjmuje
obiekt `id` + `fields` i zostaje na stronie sklepu. Brak tych pól zostawia
sam czat. Widget nie dostaje pól wyglądu karty.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| widget-config-001 | high | `showProduct` jako pole obiektu widgetu |
| widget-config-002 | high | Obiekt widgetu bez karty |
| widget-config-003 | high | Odrzucenie pola `showProduct` bez adresu karty |
| widget-config-004 | high | `mountObject` zostaje na obiekcie widgetu |
| widget-config-005 | high | Komunikat obiektu ze słownikiem napisów |
| widget-config-006 | high | Odrzucenie komunikatu spoza kontraktu |

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

### widget-config-004 — `mountObject` zostaje na obiekcie widgetu

- **Kod:** `tests/widget/embed/widget-config.test.ts` → `it('keeps mountObject on the widget object')`
- **Krytyczność:** high
- **Logika:** metoda renderowania jest częścią obiektu sklepu i nie jest serializowana do adresu.
- **Wejście:** `{ mountObject }` jako funkcja
- **Wyjście:** ten sam obiekt z tą funkcją

### widget-config-005 — Komunikat obiektu ze słownikiem napisów

- **Kod:** `tests/widget/embed/widget-config.test.ts` → `it('reads an object message with a string map and a clear')`
- **Krytyczność:** high
- **Logika:** iframe przekazuje obiekt jako `id` i `fields`. Klucze słownika nie są częścią kontraktu. `null` zdejmuje widok.
- **Wejście:** komunikat `eva.object` z `id` `' sku-1 '` i polami `sku`, `variant`; drugi komunikat z `object: null`
- **Wyjście:** obcięte `id` i te same pola; drugi wynik ma `object: null`

### widget-config-006 — Odrzucenie komunikatu spoza kontraktu

- **Kod:** `tests/widget/embed/widget-config.test.ts` → `it('rejects an object message that is not the widget contract')`
- **Krytyczność:** high
- **Logika:** obcy `source`, puste `id` albo wartość inna niż napis nie jest obiektem do renderowania.
- **Wejście:** `source: 'shop'`; `id` z samych białych znaków; `fields.price` jako liczba
- **Wyjście:** `null` dla każdego z tych komunikatów
