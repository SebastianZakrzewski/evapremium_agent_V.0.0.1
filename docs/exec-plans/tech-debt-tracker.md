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
- **Nie robić przy usuwaniu:** HTTP czatu, Mastra, Bitrix, apply migracji na
  PROD bez zgody, sprzężenie z `TemplateCascadeService`.
