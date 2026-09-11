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

## TD-003 — CORS i routing HTTP bez bootu Nest 12 w Jest

- **Slice:** 4 (HTTP + Mastra)
- **Stan:** otwarte
- **Priorytet:** średni (kontrakt originów i ścieżek jest w kodzie; Jest nie
  ćwiczy Express)
- **Kompromis:** `configureChatHttp` w `api/src/main.ts` ustawia CORS z
  `SHOP_CORS_ORIGINS` (`docs/SECURITY.md`). `ChatController` ma
  `POST /v1/sessions` i `POST /v1/sessions/:sessionId/messages`. Test
  `chat.contract.spec.ts` nie startuje aplikacji Nest (Jest + Nest 12 ESM);
  CORS to asercja listy originów, sesja/wiadomość — `InMemoryChatSessions` +
  `postChatMessage` + `StubChatAgent`.
- **Wpływ:** regresja `enableCors` / mapowania ścieżek Express może przejść
  `npm test`, dopóki lista originów i funkcja `postChatMessage` są poprawne.
  Lista originów nadal nie jest szersza niż sklep.
- **Warunek usunięcia:** test HTTP (np. osobny runner albo Jest zdolny
  zbootować Nest) woła prawdziwe `POST /v1/sessions` i sprawdza nagłówki CORS
  z `configureChatHttp`, bez DeepSeek.
- **Nie robić przy usuwaniu:** Bitrix, persistencja Supabase, apply PROD,
  zmiana originów poza `SECURITY.md`, sprzężenie kaskady/wyceny/drzewa z
  `chat/`.

## TD-004 — sesje czatu in-memory zamiast `eva_bot.chat_sessions`

- **Slice:** 4 (HTTP + Mastra)
- **Stan:** otwarte
- **Priorytet:** średni (blokuje transkrypt i debug w PROD, nie blokuje
  kontraktu wiadomości)
- **Kompromis:** `ChatService` trzyma `InMemoryChatSessions` (zbiór id w
  procesie). Brak zapisu `chat_sessions` / `chat_messages` w Supabase — to
  Slice 5. Restart API gubi sesje.
- **Wpływ:** widget może dostać 404 po redeployu; brak transkryptu do leada.
  LLM nadal nie jest magazynem sesji.
- **Warunek usunięcia:** adapter za tym samym kontraktem `create` /
  `assertExists` (rozszerzonym o wiadomości) pisze do `eva_bot` w Slice 5.
  Fixture in-memory zostaje w testach.
- **Nie robić przy usuwaniu:** lead Bitrix bez zgody, apply PROD bez zgody,
  zmiana portu `CHAT_AGENT`, źródło ceny/faktu z LLM.

## TD-005 — Mastra `generate` tylko przy `DEEPSEEK_API_KEY`

- **Slice:** 4 (HTTP + Mastra)
- **Stan:** otwarte
- **Priorytet:** niski (CI ma zostać bez klucza i bez sieci do DeepSeek)
- **Kompromis:** `ChatModule` wiąże `CHAT_AGENT` z `StubChatAgent`, gdy brak
  `DEEPSEEK_API_KEY`; `MastraChatAgent` + `createEvaMastraAgent`
  (`deepseek/deepseek-v4-flash`, `createTool` → `ShopTools`) tylko z kluczem.
  `verify` nie woła `agent.generate`.
- **Wpływ:** produkcyjna ścieżka tekstu modelu i tool-calling Mastry nie jest
  w czerwonym teście; strzeżony jest kontrakt narzędzi Nest przez stub.
- **Warunek usunięcia:** test adaptera z nagraniem/fakiem Mastry (bez żywego
  API) albo osobny job z sekretem, poza domyślnym `npm run verify`.
- **Nie robić przy usuwaniu:** klucz w widgecie, LLM jako źródło kwoty/SQL/id
  szablonu, Bitrix, persistencja sesji.
