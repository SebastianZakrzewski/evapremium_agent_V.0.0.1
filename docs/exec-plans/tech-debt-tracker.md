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
  procesie). Slice 5 rozszerzył kontrakt o `appendMessage` / `listMessages`
  i dodał SQL `eva_bot.chat_sessions` / `chat_messages` w repo; proces Nest
  nadal nie pisze do Supabase (TD-006).
- **Wpływ:** widget może dostać 404 po redeployu; brak transkryptu w PROD.
  LLM nadal nie jest magazynem sesji.
- **Warunek usunięcia:** adapter za tym samym kontraktem `create` /
  `assertExists` / `appendMessage` / `listMessages` pisze do `eva_bot`.
  Fixture in-memory zostaje w testach. Zamknąć razem z TD-006.
- **Nie robić przy usuwaniu:** lead Bitrix bez zgody, apply PROD bez zgody,
  zmiana portu `CHAT_AGENT`, źródło ceny/faktu z LLM.

## TD-005 — Mastra `generate` tylko przy `DEEPSEEK_API_KEY`

- **Slice:** 4 (HTTP + Mastra)
- **Stan:** otwarte
- **Priorytet:** niski (CI ma zostać bez klucza i bez sieci do DeepSeek)
- **Kompromis:** `ChatModule` wiąże `CHAT_AGENT` z `StubChatAgent`, gdy brak
  `DEEPSEEK_API_KEY`; `MastraChatAgent` + `createEvaMastraAgent`
  (`deepseek/deepseek-v4-flash`, `createTool` → `ShopTools`) tylko z kluczem.
  `verify` nie woła `agent.stream`.
- **Wpływ:** produkcyjna ścieżka tekstu modelu i tool-calling Mastry nie jest
  w czerwonym teście; strzeżony jest kontrakt narzędzi Nest przez stub.
- **Warunek usunięcia:** test adaptera z nagraniem/fakiem Mastry (bez żywego
  API) albo osobny job z sekretem, poza domyślnym `npm run verify`.
- **Nie robić przy usuwaniu:** klucz w widgecie, LLM jako źródło kwoty/SQL/id
  szablonu, Bitrix, persistencja sesji.

## TD-006 — transkrypt czatu in-memory zamiast `eva_bot` PROD

- **Slice:** 5 (sesja i lead)
- **Stan:** otwarte
- **Priorytet:** średni (blokuje debug i kontekst leada w PROD, nie blokuje
  kontraktu append user/assistant ani bramki zgody)
- **Kompromis:** `postChatMessage` dopisuje `user` + `assistant` do
  `InMemoryChatSessions`. Migracja
  `supabase/migrations/20260912002000_chat_sessions.sql` jest w repo, bez
  apply na PROD. Brak adaptera Supabase za tym samym kontraktem.
- **Wpływ:** transkrypt ginie przy restarcie API; CRM dostaje tylko id sesji
  w `COMMENTS`, a w PROD nie ma wierszy `chat_messages` do odczytu. LLM
  nadal nie jest magazynem sesji.
- **Warunek usunięcia:** Nest pisze `chat_sessions` / `chat_messages` przez
  adapter (`create` / `assertExists` / `appendMessage` / `listMessages`).
  In-memory zostaje w testach. Zamknąć razem z TD-004.
- **Nie robić przy usuwaniu:** apply migracji na PROD bez zgody, kopiowanie
  transkryptu do Bitrix, `crm.lead.add` bez kontaktu i zgody, Slice 6
  (widget/Sentry).

## TD-007 — `FetchBitrixHttp` tylko przy `BITRIX_WEBHOOK_URL`

- **Slice:** 5 (sesja i lead)
- **Stan:** otwarte
- **Priorytet:** niski (CI ma zostać bez webhooka i bez sieci do Bitrix)
- **Kompromis:** `LeadModule` wiąże `BITRIX_LEAD_CLIENT` z `FakeBitrixHttp`,
  gdy brak `BITRIX_WEBHOOK_URL`; `FetchBitrixHttp` + `BitrixLeadClient`
  (`crm.lead.add.json`) tylko z URL. `verify` ćwiczy fake POST, nie `fetch`.
- **Wpływ:** produkcyjna ścieżka webhooka (błąd HTTP, kształt `result`) nie
  jest w czerwonym teście; strzeżona jest bramka zgody/kontaktu i URL metody.
- **Warunek usunięcia:** test klienta z nagraniem/fakiem odpowiedzi Bitrix
  (bez żywego portalu) albo osobny job z sekretem, poza domyślnym
  `npm run verify`.
- **Nie robić przy usuwaniu:** webhook w widgecie, lead bez zgody, apply
  PROD, LLM jako źródło pól leada.

## TD-008 — widget czyta `quoted`/`miss` z `data`, Mastra zwraca `generated`+`text`

- **Slice:** 6 (widget + snippet)
- **Stan:** otwarte
- **Priorytet:** średni (stub w `verify` ustawia `quoted`/`miss` w `data`; produkcja z kluczem DeepSeek idzie przez `MastraChatAgent`)
- **Kompromis:** UI formatuje wycenę/miss z `data` gdy status to `quoted`/`miss`
  (ścieżka stubu). Przy `generated` pokazuje `turn.text` (adapter Mastry,
  TD-005) i nie zgaduje kwoty. Nie zmieniamy kontraktu `MastraChatAgent`
  w Slice 6 (Slice 4 `(zrobione)`).
- **Wpływ:** treść wyceny w produkcji zależy od tego, czy model powtórzy
  wynik narzędzia w `text`; widget nie czyta kwoty z `generated`.
- **Warunek usunięcia:** osobny slice — adapter Mastry mapuje wynik narzędzi
  Nest na `data.status` `quoted`/`miss`/`hit` (albo widget dostaje ten sam
  kształt co stub), bez LLM jako źródła `amount`.
- **Nie robić przy usuwaniu:** klucz w widgecie, zmiana Bitrix/lead, apply PROD.

## TD-009 — Origin iframe widgetu vs CORS sklepu

- **Slice:** 6 (widget + snippet)
- **Stan:** otwarte
- **Priorytet:** średni (blokuje czat z hostowanego CDN w przeglądarce sklepu)
- **Kompromis:** `embed.js` wstawia iframe z originu widgetu (Vercel/CDN).
  `SHOP_CORS_ORIGINS` to tylko `https://evapremium.pl` i `www`. Fetch z
  iframe ma `Origin` CDN, nie sklepu.
- **Wpływ:** po wklejeniu snippetu czat z CDN nie przejdzie CORS, dopóki
  Slice 7 nie doda originu widgetu albo nie osadzi UI w originie sklepu.
- **Warunek usunięcia:** decyzja w Slice 7 (origin widgetu na liście CORS
  albo inny sposób osadzenia). Bez apply PROD w Slice 6.
- **Nie robić przy usuwaniu:** sekrety w snippecie, otwarty CORS `*`.
