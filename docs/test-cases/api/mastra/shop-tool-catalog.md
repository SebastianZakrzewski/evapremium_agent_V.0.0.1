# Katalog shop-tooli Mastry

Kod: `tests/api/mastra/tools/shop-tool-catalog.spec.ts`

Logika zestawu: shop-tool’e żyją w `tests/api/mastra/tools/`, są rejestrowane na
instancji `Mastra` (`tools`) i podawane agentowi `evaShopAgent` z tego samego
katalogu. Filtrowanie per intencja zostaje w `toolsForRequestContext`.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| catalog-001 | high | jeden tool na każdy ShopToolId |
| catalog-003 | critical | quote-vehicle zwraca kwotę z macierzy |
| catalog-002 | high | Mastra.listTools zawiera pełny katalog dla Studio |

### catalog-001 — jeden tool na każdy ShopToolId

- **Kod:** `tests/api/mastra/tools/shop-tool-catalog.spec.ts` → `it('builds one Mastra tool per ShopToolId with matching id')`
- **Krytyczność:** high
- **Logika:** id `createTool` = klucz w katalogu i wpis w `IntentProfile.tools`.
- **Wejście:** `createShopToolCatalog(fixtureShopTools())`
- **Wyjście:** dla każdego `SHOP_TOOL_IDS` — `catalog[id].id === id`

### catalog-003 — quote-vehicle zwraca kwotę z macierzy

- **Kod:** `tests/api/mastra/tools/shop-tool-catalog.spec.ts` → `it('quotes through quote-vehicle when slots and variant resolve to one matrix row')`
- **Krytyczność:** critical
- **Logika:** tool katalogu woła `ShopTools.quoteVehicle`, nie szkielet.
- **Wejście:** `vw`, `golf 8`, `hatchback`, `komplet-5szt`
- **Wyjście:** `{ status: 'quoted', amount: 599, currency: 'PLN' }`

### catalog-002 — rejestr instancji Mastry zawiera pełny katalog dla Studio

- **Kod:** `tests/api/mastra/tools/shop-tool-catalog.spec.ts` → `it('registers the full catalog on the Mastra instance for Studio')`
- **Krytyczność:** high
- **Logika:** `createEvaMastra` spreaduje `mastraInstanceToolRegistry` do `new Mastra({ tools })`, więc Studio widzi project tools.
- **Wejście:** `mastraInstanceToolRegistry(createShopToolCatalog(fixtureShopTools()))`
- **Wyjście:** `registry.tools` ma dokładnie `SHOP_TOOL_IDS` i jest tym samym obiektem co katalog agenta
