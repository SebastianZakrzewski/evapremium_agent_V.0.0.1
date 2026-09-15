# Tech debt tracker

Świadomie przyjęty dług. Wpisuj tylko realny kompromis, nie placeholder.

## TD-001 — katalogi cennika in-memory zamiast `evapremium_shop`

- **Slice:** 2 (wycena); zamknięcie 7
- **Stan:** zamknięte
- **Priorytet:** —
- **Kompromis (historyczny):** fixture in-memory w teście.
- **Aktualnie:** `PricingModule` przy `SUPABASE_*` ładuje aktywny katalog
  `evapremium_shop` (`loadPricingLists`); bez env — fixture (`verify`).
- **Nie robić przy dalszych zmianach:** LLM jako źródło kwoty, anon key w widgecie.

## TD-002 — węzły context tree in-memory zamiast `eva_bot.context_nodes`

- **Slice:** 3 (context tree); zamknięcie 7
- **Stan:** zamknięte
- **Kompromis (historyczny):** fixture + migracja w repo.
- **Aktualnie:** `loadContextNodes` przy env Supabase; fixture w `verify`.
  Tabela `eva_bot.context_nodes` jest na PROD.

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

- **Slice:** 4 (HTTP + Mastra); zamknięcie 7
- **Stan:** zamknięte (razem z TD-006)
- **Aktualnie:** `CHAT_SESSIONS` → `SupabaseChatSessions` przy env (schemat
  PROD: `text` + `direction`); in-memory w `verify`.

## TD-005 — Mastra `generate` tylko przy `DEEPSEEK_API_KEY`

- **Slice:** 4 (HTTP + Mastra)
- **Stan:** otwarte
- **Priorytet:** niski (CI ma zostać bez klucza i bez sieci do DeepSeek)
- **Kompromis:** `ChatModule` wiąże `CHAT_AGENT` z `StubChatAgent`, gdy brak
  `DEEPSEEK_API_KEY`; `MastraChatAgent` + `createEvaMastra` /
  `createEvaMastraAgent` (`deepseek/deepseek-flash`, `createTool` →
  `ShopTools`, `RequestContext.intent`) tylko z kluczem.
  `verify` nie woła `agent.stream`.
- **Wpływ:** produkcyjna ścieżka tekstu modelu i tool-calling Mastry nie jest
  w czerwonym teście; strzeżony jest kontrakt narzędzi Nest przez stub.
- **Warunek usunięcia:** test adaptera z nagraniem/fakiem Mastry (bez żywego
  API) albo osobny job z sekretem, poza domyślnym `npm run verify`.
- **Nie robić przy usuwaniu:** klucz w widgecie, LLM jako źródło kwoty/SQL/id
  szablonu, Bitrix, persistencja sesji.

## TD-006 — transkrypt czatu in-memory zamiast `eva_bot` PROD

- **Slice:** 5 (sesja i lead); zamknięcie 7
- **Stan:** zamknięte
- **Aktualnie:** zapis na istniejących tabelach PROD (nie apply
  `20260912002000_chat_sessions.sql` — inny kształt kolumn). Fixture w teście.

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

- **Slice:** 6 (widget + snippet); zamknięcie 7
- **Stan:** zamknięte
- **Aktualnie:** `chatCorsOrigins(WIDGET_ORIGIN)` dokłada HTTPS origin widgetu
  do listy sklepu. Ustaw `WIDGET_ORIGIN` na VPS po deployu Vercel.

## Intent workflow — Slice 1–4

Slice 1–4 **nie dodają** świadomego długu poza TD-003/TD-005 (Jest bez
`MastraChatAgent`) oraz TD-010.

## TD-010 — `allowedTransitions` bez stanu sesji w `ChatAgent`

- **Slice:** intent-workflow 4; domknięcie: pamięć in-process
- **Stan:** zamknięte (egzekucja krawędzi)
- **Aktualnie:** `acceptIntentTransition` + `InMemoryIntentSessionState`;
  `ChatAgent.stream(message, sessionId)`. Fallback niskiej pewności omija
  filtr. Stan ginie przy restarcie procesu (nie w `chat_sessions`).

## TD-011 — DuckDB jako observability na VPS (nie ClickHouse)

- **Stan:** otwarte
- **Priorytet:** niski
- **Kompromis:** Mastra poleca DuckDB do dev, ClickHouse do produkcji. EVA
  ma jednego agenta na Hetznerze; DuckDB to drugi plik na `/opt/evabot/mastra`.
- **Wpływ:** duży ruch / wiele procesów może zaciąć plik DuckDB; wtedy
  ClickHouse.
- **Nie robić przy usuwaniu:** LibSQL jako magazyn metryk Studio.

## TD-012 — próg RAG 0.49: recall@K OK, hit@1 niepełny (cosine only)

- **Stan:** zamknięte (hybrid ranking w kodzie; PROD wymaga `retrieval_text` + ingest)
- **Priorytet:** —
- **Kompromis (historyczny):** cosine + próg 0.49 → hit@1 ≈ 0.57 na siódemce
  kalibracji (2026-09-15).
- **Aktualnie:** `search-leaves` = cosine (sitko 0.49) + BM25 + RRF + rerank +
  `confidence`; test `hybrid-retrieval-baseline.spec.ts` ≥ 6/7 hit@1 na fixture
  z `retrieval_text`. Cosine sam nadal słaby — próg nie podnosić.
- **PROD:** puste `retrieval_text` = fallback title+body; pełny efekt po wklejeniu
  tekstów i `npm run ingest:leaves` (apply migracji `retrieval_text` za zgodą).
- **Nie robić przy usuwaniu:** body w wyniku `search-leaves`, scrape w runtime.

