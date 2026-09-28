# Widget — wtyczka

Kod: `tests/widget/embed/widget-plugin.test.ts`  
Standard: [docs/test-cases/README.md](../README.md)

Logika zestawu: serwis wdraża `widget-plugin.js` i wypełnia obiekt
`window.widgetPlugin`. Pole `showProduct` dopasowuje kartę do serwisu. Zły
adres karty nie montuje wtyczki. Skrypt nie niesie nazwy marki ani sekretów
serwera.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| widget-plugin-001 | high | Montowanie czatu z obiektu widgetu |
| widget-plugin-002 | high | Czat bez pól domeny |
| widget-plugin-003 | high | Brak montowania przy złym `showProduct` |
| widget-plugin-004 | high | Publiczny skrypt i global `widgetPlugin` |
| widget-plugin-005 | high | Dokument agenta obok skryptu |
| widget-plugin-006 | high | `mountObject` nie wchodzi do adresu czatu |

### widget-plugin-001 — Montowanie czatu z obiektu widgetu

- **Kod:** `tests/widget/embed/widget-plugin.test.ts` → `it('installs the chat frame from the shop widget object')`
- **Krytyczność:** high
- **Logika:** obiekt serwisu przechodzi do adresu iframe jako `productId` i `cardUrl`.
- **Wejście:** origin `https://widget.example.cdn`, id `eva-shop`, `showProduct` dla `audi-a4`
- **Wyjście:** znormalizowany `config` oraz `iframeSrc` z `widget`, `productId` i zakodowanym `cardUrl`

### widget-plugin-002 — Czat bez pól domeny

- **Kod:** `tests/widget/embed/widget-plugin.test.ts` → `it('installs chat when the shop leaves the domain fields empty')`
- **Krytyczność:** high
- **Logika:** pusty obiekt widgetu montuje sam czat, z id serwisu w query.
- **Wejście:** origin ze slashem, id `other-shop`, `{}`
- **Wyjście:** `config` `{}`, `iframeSrc` z samym `widget=other-shop`

### widget-plugin-003 — Brak montowania przy złym `showProduct`

- **Kod:** `tests/widget/embed/widget-plugin.test.ts` → `it('does not install when showProduct is not a shop card address')`
- **Krytyczność:** high
- **Logika:** `http` nie jest kartą serwisu, więc wtyczka się nie instaluje.
- **Wejście:** `cardUrl` na `http`
- **Wyjście:** `null`

### widget-plugin-004 — Publiczny skrypt i global `widgetPlugin`

- **Kod:** `tests/widget/embed/widget-plugin.test.ts` → `it('exposes a public plugin script the host configures through window.widgetPlugin')`
- **Krytyczność:** high
- **Logika:** snippet ładuje `widget-plugin.js` z publicznym id. Skrypt czyta `window.widgetPlugin` i pole `showProduct`, bez nazwy marki i bez sekretów.
- **Wejście:** `widgetPluginSnippet('https://widget.example.cdn')`, treść `widget/public/widget-plugin.js`
- **Wyjście:** `src` na `/widget-plugin.js`, `data-eva-widget="eva-shop"`, w skrypcie `widgetPlugin` i `showProduct`, brak `EVA Premium` i markerów sekretów

### widget-plugin-005 — Dokument agenta obok skryptu

- **Kod:** `tests/widget/embed/widget-plugin.test.ts` → `it('ships the agent document next to the plugin script')`
- **Krytyczność:** high
- **Logika:** `widget/public/widget-plugin.md` podaje adres, z którego inny projekt pobiera kontrakt z GitHuba.
- **Wejście:** treść `widget/public/widget-plugin.md`
- **Wyjście:** wzmianki `window.widgetPlugin`, `showProduct`, `widget-plugin.js` i surowy adres tego pliku na GitHubie

### widget-plugin-006 — `mountObject` nie wchodzi do adresu czatu

- **Kod:** `tests/widget/embed/widget-plugin.test.ts` → `it('keeps mountObject off the chat frame address')`
- **Krytyczność:** high
- **Logika:** metoda renderowania zostaje w konfiguracji hosta. Adres iframe niesie tylko id widgetu.
- **Wejście:** origin `https://widget.example.cdn`, id `eva-shop`, `mountObject` jako funkcja
- **Wyjście:** `config` z tą funkcją, `iframeSrc` z samym `widget=eva-shop`
