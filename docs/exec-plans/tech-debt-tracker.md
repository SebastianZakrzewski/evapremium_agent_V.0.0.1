# Tech debt tracker

Świadomie przyjęty dług. Wpisuj tylko realny kompromis, nie placeholder.

## TD-001 — katalogi cennika in-memory zamiast `evapremium_shop`

- **Slice:** 2 (wycena)
- **Stan:** otwarte
- **Priorytet:** średni (blokuje prawdziwe kwoty na sklepie, nie blokuje kontraktu domeny)
- **Kompromis:** `PricingModule` wiąże porty
  `PricingVariantCatalog` / `PricingCategoryVariantCatalog` / `PricingMatrixCatalog`
  z fixture in-memory (`api/src/pricing/in-memory/`). Kwoty i listy wariantów
  w teście i w procesie Nest pochodzą z tej macierzy, nie z PROD.
- **Wpływ:** wycena w aplikacji nie odzwierciedla aktualnych tabel
  `pricing_variants`, `pricing_category_variants`, `pricing_matrix` (oraz
  powiązanych kategorii) w `evapremium_shop`. Ryzyko rozjazdu kwot po zmianie
  cennika w sklepie. LLM nadal nie jest źródłem ceny.
- **Warunek usunięcia:** Nest czyta tabele cennika `evapremium_shop` przez
  adapter za tymi samymi portami (bez zmiany kontraktu `listCategoryVariants` /
  `quotePrice`). Fixture zostaje w testach.
-   **Nie robić przy usuwaniu:** HTTP czatu, Mastra, Bitrix, apply migracji na
  PROD bez zgody, sprzężenie z `TemplateCascadeService`.

## TD-002 — węzły context tree in-memory zamiast `eva_bot.context_nodes`

- **Slice:** 3 (context tree)
- **Stan:** otwarte
- **Priorytet:** średni (blokuje prawdziwe FAQ/klauzule ze sklepu, nie blokuje kontraktu lookupu)
- **Kompromis:** `ContextTreeModule` wiąże port `ContextNodeCatalog` z fixture
  in-memory (`api/src/context-tree/in-memory/`). Hit/miss i `body` w teście
  i w procesie Nest pochodzą z tej listy, nie z PROD. Migracja tabeli jest
  w repo (`supabase/migrations/20260912001000_context_nodes.sql`), bez apply.
- **Wpływ:** treść liści (w tym puste seed `chat-zapis` / `zgoda-lead`) w
  aplikacji nie odzwierciedla aktualnej tabeli `eva_bot.context_nodes`.
  Ryzyko rozjazdu faktów po wklejeniu treści przez biznes. LLM nadal nie
  jest źródłem FAQ.
- **Warunek usunięcia:** Nest czyta `eva_bot.context_nodes` przez adapter za
  tym samym portem (bez zmiany kontraktu `lookupLeaf` / `lookupContextLeaf`).
  Fixture zostaje w testach.
- **Nie robić przy usuwaniu:** HTTP czatu, Mastra, Bitrix, apply migracji na
  PROD bez zgody, sprzężenie z `PricingModule` / `TemplateCascadeService`.
