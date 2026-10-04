# ARCHITECTURE.md

## Stan implementacji

Szkielet monorepo (npm workspaces): `api/` (NestJS + Express, Mastra w tym
samym procesie za portem `CHAT_AGENT`), `widget/` (React / Vite) i
`dashboard/` (React / Vite, przegląd doby, lista i szczegół sesji). Kaskada,
wycena i context tree: serwisy Nest; przy `SUPABASE_URL` +
`SUPABASE_SERVICE_ROLE_KEY` katalogi ładują PROD (`evapremium_shop` /
`eva_bot`) raz przy starcie, bez env zostaje fixture. HTTP czatu:
`POST /v1/sessions` (powitanie + chipy tematów, bez LLM; pierwsza linia
asystenta w transkrypcie); wiadomości SSE. Transkrypt: `ChatSessions` — in-memory
w teście, `eva_bot.chat_sessions` / `chat_messages` (kolumny PROD `text` +
`direction`) przy Supabase. DeepSeek za adapterem Mastry; stub bez klucza.
CORS: originy sklepu + opcjonalny `WIDGET_ORIGIN` (HTTPS). `trust proxy`
= 1 (jeden hop Caddy). Budżet tur: 25 wiadomości sesji, 40 wiadomości i
10 sesji gościa na godzinę UTC; skrót IP, nie adres. Przy
`MASTRA_STUDIO_TOKEN` + DeepSeek: HTTP Mastry pod `/mastra` (SimpleAuth).
Studio: drugi kontener (`Dockerfile.studio`) na `:4111` (Caddy basic auth +
proxy `/mastra` na Nest). System prompt tury: opublikowane prompt-blocks.
CORS: localhost Studio. Lead Bitrix za
`LeadModule`. Widget: EvaBot + snippet `embed.js`. Sentry: `@sentry/nestjs`
przy `SENTRY_DSN` (`instrument.ts` przed Nest, `SentryGlobalFilter`; awarie
SSE przez `reportUnexpectedError`). DSN, nie token użytkownika.
Dashboard operatora: eventy domenowe in-memory albo `eva_bot.agent_events`;
odczyt `GET /v1/dashboard/*` za `DASHBOARD_TOKEN`; UI ma bramkę tokenu
sesyjnego, przegląd doby, listę sesji ze znacznikami eventów, szczegół
z transkryptem oraz osią eventów i graf podobieństwa liści (`#/graf`).
Poniżej są **zaakceptowane granice MVP**.

Ten dokument jest źródłem prawdy o architekturze wysokiego poziomu.

## Cel systemu

Agent obsługi klienta sklepu [EVA Premium](https://www.evapremium.pl)
(dywaniki EVA szyte na miarę). Kanał: **chat widget** osadzony na stronie sklepu.

MVP ma **odciążyć obsługę**: informacja o produkcie + wycena orientacyjna.
Sprzedaż w czacie, płatności, zwroty — poza MVP.

Zachowanie produktu: `docs/product-specs/mvp-obsluga-klienta.md`.
Zasady decyzyjne: `docs/design-docs/core-beliefs.md`.

## Komponenty i zależności

Kierunek zależności: sklep ładuje snippet → hostowany widget → NestJS;
Mastra → NestJS; NestJS → Supabase; NestJS → Bitrix24 (leady).
LLM nie sięga do bazy ani nie jest źródłem cen ani polityki sklepu.

Skorupa tury siedzi w `ChatModule`: HTTP, kwalifikacja, `acceptIntentTransition`,
stan sesji, stream Mastry, eventy. Kwalifikator nie wznawia workflow.
`ChatModule` wstrzykuje `TURN_WORKFLOWS` (`evaTurnWorkflows`): otwarty
`fitment_cascade` albo `quote_vehicle` dostaje wiadomość i albo dopytuje
o slot, albo woła Nest. Inny sklep podmienia ten provider, katalog tooli
i prompt-bloki, zostawiając moduły Nest. Nazwy `createEvaMastra` /
`evaShopAgent` zostają przy tej aplikacji.

Moduły produktu zostają osobno: `TemplateCascadeModule`, `PricingModule`,
`ContextTreeModule`, `LeadModule`. Cena, szablon i liść FAQ wychodzą stamtąd.

Kod w jednym gicie, pakiety `api`, `widget` i `dashboard`. Deploy nadal
rozdzielony: Nest na Hetznerze; widget i dashboard jako **osobne** originy
Vercel. SPA dashboardu nie robi rewrite `/v1` na VPS. Projektu Vercel
dashboardu i env Hetzner `DASHBOARD_*` **nie** założono w tej serii;
apply za zgodą, nie kolejnym slice'em planu.

| Warstwa | Technologia | Odpowiedzialność |
| --- | --- | --- |
| Prezentacja | React, hostowany widget | Snippet na `evapremium.pl`; UI czatu z Waszego originu |
| Agent / LLM | Mastra + DeepSeek | Czat z kluczem: qualify → `IntentProfile` → ten sam `evaShopAgent` (`RequestContext.intent`, podzbiór tooli). Wznowienie `fitment_cascade` i `quote_vehicle` idzie przez `TURN_WORKFLOWS` wstrzyknięty w `ChatModule`. `verify` bez klucza: stub. Studio: kontener `evabot-studio` (`:4111` → `/mastra` na Nest) |
| Logika biznesowa | NestJS | Kaskada filtrów, wycena, context tree, utworzenie leada; jedyne I/O do danych i CRM |
| Dane | Supabase PROD | `evapremium_shop` (szablony, cennik), `eva_bot` (aliasy slotów, sesje, context tree) |
| CRM | Bitrix24 | Kolejka pracy człowieka (zapis leada z czatu) |
| Obserwowalność | Sentry + Mastra Studio | Błędy Nest (Sentry DSN). Editor/pamięć Mastry: LibSQL. Wykresy, discovery, feedback Studio: DuckDB (plik obok LibSQL na wolumenie hosta) |
| Jakość | TDD | Test najpierw, potem implementacja |

## Źródła danych

Projekt Supabase **PROD** (`kmepxyervpeujwvgdqtm`). Nest czyta schematy
serwerowo (nie anon z widgetu).

1. **Szablony:** `evapremium_shop.mat_templates` (~2756, aktywne szablony).
   Kaskada po `brand_key` / `model_key` / `body_type_*_key` / lata / `record_key`.
   Wiersze o tej samej marce, modelu, latach, nadwoziu i kategorii cennika liczą się
   jako jeden szablon (zostaje mniejszy `record_key`); różne auta dalej dają `many`.
   Kategoria cennika: `dealer_pricing_category_key`. Gdy jest `DEEPSEEK_API_KEY`,
   markę i model wybierają dwa kroki klasyfikacji: pełna lista `brand_key`,
   potem krótka lista `model_key` tej marki. Istnienie szablonu zostaje w
   filtrze Nestu. Aliasy `eva_bot.vehicle_slot_aliases` (`slot_kind`,
   `alias_normalized`, `canonical_key`, opcjonalny `brand_key` dla modeli)
   są pierwszym trafieniem marki i modelu; klasyfikator dostaje tylko to, czego
   alias nie pokrył. Tabela jest na PROD
   (migracja `20260911220000_vehicle_slot_aliases.sql`).    W teście: fixture,
   jeden strzał ze znanymi kluczami → 0 / 1 / N. Wycena wymaga marki, modelu,
   roku i typu nadwozia. Dopasowanie filtruje już przy marce i modelu i pyta
   tylko o pole, które jeszcze rozdziela szablony. Pusty wynik zdejmuje najpierw
   nadwozie, potem rok, i pyta o pole, które wyzerowało trafienia. Pytanie o
   dopasowanie, które już nazywa auto, uruchamia `fitment_cascade` także gdy
   kwalifikator zwróci `knowledge`. Brakujące pole wstrzymuje workflow
   (`fitment_cascade` albo `quote_vehicle`) i agent dopytuje. Krótka odpowiedź
   uzupełnia dopytywany slot, a z tego samego zdania zbierane są też rok i
   nadwozie. Stan zbierania slotów jest w pamięci procesu. Po turze Nest
   zapisuje zebrane fakty w `eva_bot.session_clients` (migracja
   `20260927140000_session_clients.sql`, apply PROD za zgodą): imię, nazwisko,
   telefon, mail i zgoda, jeśli klient je podał, oraz auto i klucz szablonu.
   Kolejna tura dostaje z tego rekordu tylko ten wycinek, którego potrzebuje
   odpowiedź: auto przy doborze, wycenie i dalszym ciągu `product_info`
   (na przykład „i jak?”). Pytanie o kolor, materiał, dostawę albo reklamację
   nie dostaje profilu. Zapisany wynik `one` wraca do tury, zanim model
   odpowie, o ile nowe zdanie nie nazywa innego auta. Przypadkowa encja z
   całego zdania („już podałem”) nie nadpisuje marki. Odpowiedź na rok
   zbiera też nadwozie z tego samego zdania.
2. **Cennik:** `pricing_vehicle_categories`, `pricing_variants`,
   `pricing_category_variants`, `pricing_matrix` (cena = kategoria + wariant +
   `mat_type`). Zakres: wszystkie szablony z tabeli, nie podzbiór „hitów”.
3. **Context tree:** `eva_bot.context_nodes` (na PROD, migracja
   `20260912001000_context_nodes.sql`). Kolumny: `id`,
   `parent_id` (NULL = korzeń), `slug`, `title`, `body` (puste u gałęzi, treść
   u liścia), `sort_order`, `is_active`. Nest lookup po unikalnym `slug`
   (aktywny liść → `body`, w tym puste seed; gałąź / brak / nieaktywny → miss).
   W procesie: fixture in-memory za portem (jak kaskada i wycena).
   Pomocniczy indeks `eva_bot.context_node_embeddings` (`vector(1536)`,
   migracja `20260913220000_context_node_embeddings.sql` w repo; na PROD
   zastosowany). Nest: `OPENAI_API_KEY` → `text-embedding-3-small`; indeks
   `context_node_embeddings` ładuje ten sam `DataStore` co liście (service
   role, bez `DATABASE_URL` w turze czatu). Wyszukiwanie liści (`search-leaves`):
   cosine (sitko ≥ `CONTEXT_LEAF_SEARCH_THRESHOLD` 0.49, pula do 10) + BM25 na
   `retrieval_text` (fallback `title`+`body`) + RRF + rerank leksykalny +
   `confidence` (`high` / `ambiguous`); do agenta max 4 slugi `{ slug, score,
   confidence }` — bez `body`. Kolumna `retrieval_text` na
   `context_nodes` (migracja w repo; apply PROD za zgodą). Ingest: skrypt
   `npm run ingest:leaves --workspace api` (nadal `DATABASE_URL` / pg), nie
   boot czatu. Bez klucza OpenAI albo bez wierszy indeksu: puste
   wyszukiwanie. Fakt nadal `lookup-leaf` po slugu;
   wektory nie zwracają `body`. Agent tury ma tool `search-leaves` (Nest).
   Wymagane liście na start: `chat-zapis` (informacja o transkrypcie),
   `zgoda-lead` (klauzula przy telefonie/mailu). **Treść prawną wkleja biznes**
   ze sklepu; agent jej nie generuje. Dalsze FAQ (dostawa, pielęgnacja, …) jako
   kolejne liście.
4. **Sesja czatu:** `eva_bot.chat_sessions` / `chat_messages` — tabele już były
   na PROD (`text`, `direction` inbound/outbound). Nest zapisuje transkrypt za
   tym samym kontraktem co `InMemoryChatSessions` (create / append / list).
   Migracji `20260912002000_chat_sessions.sql` (kolumny `body` / `role`) **nie**
   stosować — inny kształt niż istniejący schemat.

Nie używać pustej `public.mats` ani katalogu n8n w `public` jako cennika.

Cena i fakt pochodzą wyłącznie z fetcha przez NestJS. Brak rekordu = brak
wymyślonej odpowiedzi.

## Przepływ wyceny

1. Klient opisuje auto językiem naturalnym.
2. LLM wyciąga **surowe sloty** (marka / model / nadwozie jako tekst). NestJS
   normalizuje, mapuje **tabelą aliasów** na klucze i strzela **kaskadą filtrów**.
   LLM nie wybiera id szablonu i nie pisze SQL.
3. Cel kaskady: jeden rekord `mat_templates`, jak najszybciej.
4. 0 rekordów → lead w Bitrix24, bez ceny.
5. Wiele rekordów → dopytanie / wybór, bez ceny.
6. 1 szablon → dopytanie o **wariant z `pricing_category_variants` dla kategorii
   tego szablonu** (nie pełna globalna lista 40 kluczy) → jedna wycena z
   `pricing_matrix` (**orientacyjna, nie wiążąca**). Ostateczna cena: konfigurator
   / potwierdzenie sklepu. Agent woła jedno narzędzie `quote-vehicle`; Nest
   składa kaskadę i macierz (`composeQuoteVehicle`).

Kategorie cennika (slug): `passenger_car`, `minivan`, `bus`, `pickup`,
`heavy_truck`, `passenger_car_legacy`. Typy maty w macierzy: `3d-with-rims`,
`classic`, `single`. Słownik wariantów: `pricing_variants` (`variant_key`,
`variant_label`). Źródło prawdy nazw jest w tabelach, nie w tym dokumencie.

LLM nie pisze SQL i nie podaje kwoty spoza wyniku narzędzia.

## Widget

Sklep wkleja **snippet** (skrypt). Widget z Vercel/CDN woła API Nest na Hetznerze.
Czat: okno EvaBot; tekst modelu przychodzi SSE (`delta`), wycena/miss z
zdarzenia `done` (`data` z Nest). CORS: `https://evapremium.pl`,
`https://www.evapremium.pl` oraz opcjonalny `WIDGET_ORIGIN` (hostowany
widget / Vercel). Publiczny id widgetu w snippecie, nie sekret. Szczegóły:
`docs/SECURITY.md`.

**Zaakceptowane:** obiekt widgetu (`WidgetConfig`) jest interfejsem
konfiguracji. Sklep implementuje ten obiekt u siebie. `showProduct` jest
jego polem i niesie kartę sklepu — tę samą, która jest na stronie sklepu.
Widget nie definiuje wyglądu karty. Pole jest opcjonalne: brak karty zostawia
sam czat.

Pole `showProduct`:

- `productId` — publiczny identyfikator produktu w tym sklepie.
- `cardUrl` — adres HTTPS, pod którym sklep serwuje tę kartę.

**Zaakceptowane:** opcjonalne `mountObject` montuje obiekt sklepu obok czatu.
Kontrakt nie nazywa pól domeny. Argument to `MountedObject`: niepuste `id`
oraz `fields` jako słownik napisów. Sklep czyta z `fields` własne klucze.
Widget nie interpretuje kluczy, nie dokleja ceny ani HTML. Funkcja zostaje
na stronie sklepu i nie wchodzi do query iframe. Brak metody zostawia sam
czat. Zdjęcie widoku to komunikat `eva.object` z `object: null`.
Źródło typu: `widget/src/embed/widget-config.ts`. Opis dla sklepu:
`widget/public/widget-plugin.md`.

**Zaimplementowane:** `parseWidgetConfig` czyta obiekt widgetu. Przy
`showProduct` wymaga niepustego `productId` i `cardUrl` wyłącznie `https`.
Wdrożenie w innym serwisie: skrypt `widget-plugin.js` z originu widgetu.
Inny projekt pobiera kontrakt z GitHuba
(opis repozytorium i `widget/public/widget-plugin.md`). Gdy kaskada
wskazuje jeden szablon, tura niesie `verifiedProduct` (`productId` i `fields`).
Widget wypełnia tokeny `cardUrl` tym słownikiem i otwiera iframe dopiero,
gdy w adresie nie została żadna klamra.

## LLM

Dostawca: **DeepSeek**. W Mastrze: `model: "deepseek/deepseek-flash"`, env
`DEEPSEEK_API_KEY`. API DeepSeek: id `deepseek-flash` (V4.1-Flash). Klucz tylko
po stronie serwera. Model nie jest źródłem cen ani FAQ. Język MVP: **polski**.
Kontekst implementacji: `docs/references/mastra/`.

### Workflow intencji

**Zaakceptowane:** każda wiadomość użytkownika ma iść przez workflow Mastry
(ten sam proces co Nest): kwalifikacja (LLM, bez shop-tooli) → `ShopIntent` →
w runtime wgranie `IntentProfile` (ustrukturyzowany kontekst: instrukcja +
tool-e tury). Stany = intencje; `allowedTransitions` na profilu to legalne
przejścia (mała maszyna stanów). Brak profilu nie otwiera agenta ze
wszystkimi toolami. Lead Bitrix nie jest tool-em profilu.

**Zaimplementowane:** rejestr `intentProfileFor`; kwalifikator za portem
zwraca `intent`, `sub_intent`, `mode`, `entities` i `confidence` w jednym
wywołaniu. `chooseExecution` wybiera wiedzę, `directTool` albo workflow
`quote_vehicle` (Mastra `quote-vehicle`, suspend/resume, stan w pamięci
procesu). Niska pewność: jedno `reclassify`, potem `out_of_scope` (zero
shop-tooli). Brak profilu / błąd kwalifikatora → `out_of_scope`, nie
`general_agent`. `allowedTransitions` zostaje strażnikiem grubej intencji.
`MastraChatAgent` przy kluczu DeepSeek: wczytaj stan sesji → `prepareIntentTurn`
(wznów otwarty workflow albo kwalifikuj → fallback → `acceptIntentTransition`)
→ zapamiętaj klienta → zapisz eventy → **ten sam** `evaShopAgent` z instancji
Mastry (`createEvaMastra`). Handlery workflow rejestruje `ChatModule`
(`TURN_WORKFLOWS`), nie kwalifikator.
Allowlista tooli tury pochodzi z sub-intencji, gdy jest rozpoznana.
Wycena na profilu to jeden tool `quote-vehicle`. Nest składa kaskadę i macierz
w `composeQuoteVehicle`, nie model.
Ślad `decision_trace` nie zawiera treści wiadomości. Retrieval liścia
z miękkim bonusem gałęzi, gdy tura poda `relatedBranches`; puste bonusy
zostawiają dotychczasową rurę. Per-intent: `RequestContext.intent`;
instructions i mapa tooli z profilu albo z tury. System prompt: opublikowane
prompt-blocks Editora (`{{intent}}` w display conditions); brak bloków →
złożenie z `IntentProfile` plus notatka wykonania. SSE bez zmiany ramek.
`stream(message, sessionId)`. Lead Bitrix zostaje w Neście. Bez klucza
`verify` nadal `StubChatAgent`. Editor + LibSQL (lokalnie `.mastra/editor.db`;
produkcja `MASTRA_STORAGE_URL=file:/data/mastra.db` na wolumenie hosta).
Studio Observability: DuckDB (`observability.duckdb` obok LibSQL;
`MASTRA_OBSERVABILITY_PATH` na VPS `/data/observability.duckdb`) przez
`MastraCompositeStore`. LibSQL nie serwuje metryk. Przy
`MASTRA_STUDIO_TOKEN` Nest montuje `/mastra` (`@mastra/nestjs`, SimpleAuth).
Studio na VPS: obraz `evabot-studio` (Caddy `:4111`, basic auth, proxy
`/mastra` → Nest `:3000`, wstrzyknięty Bearer). Browser same-origin, bez tunelu.
Stan intencji, otwartej wyceny i dopasowania: bez Supabase w pamięci
procesu; przy `DATA_STORE` w `eva_bot.session_agent_state` (bez treści
wiadomości).

Szczegół kontraktu: `docs/design-docs/intent-workflow.md`.
Router wykonania: `docs/design-docs/agent-execution-router.md`.
Plan: `docs/exec-plans/completed/agent-execution-router.md`.

## Hosting

Widget: **statyczny na Vercel/CDN**. NestJS + Mastra: **kontener API** na
Hetznerze; **osobny kontener Studio** (`Dockerfile.studio`, port 4111).
Obraz z GitHub, `0.0.0.0`, `PORT`. Push na `main` → GitHub
Actions (`verify`, potem SSH i `deploy/update-container.sh`). Operacje:
[`docs/DEPLOY.md`](docs/DEPLOY.md).
Snippet sklepu ładuje JS z CDN; czat woła API na Hetznerze.
Pakiet `dashboard/` jest spakowany pod osobny origin Vercel (SPA, bez rewrite
`/v1` na VPS); projektu Vercel i env Hetzner `DASHBOARD_*` **nie** założono
w tej serii. Nie PaaS i nie serverless. Widget nie jest serwowany z VPS.

## Dashboard operatora (eventy + HTTP odczytu)

Osobny produkt KPI: pakiet `dashboard/` na **Vercel** (inny origin niż widget
sklepu) — zaimplementowana bramka `DASHBOARD_TOKEN` w `sessionStorage`,
przegląd doby z czterema hipotezami, lista sesji filtrowana po dacie i jednym
znaczniku oraz szczegół z transkryptem i chronologiczną osią eventów. Kwota
jest renderowana wyłącznie z `quote_issued`; naruszenie w przeglądzie prowadzi
do sesji. Widoki używają nawigacji hash bez dodatkowego routera, w tym
`#/graf` i `#/analityka`. Analityka czyta `turn_judged`: dobór retrievalu
(zgodność lookupu z rankingiem searcha) albo akcji (narzędzie z allowlisty
tury). To nie jest ocena językowa odpowiedzi. Nie Mastra Studio
(`/mastra`) i nie kolejka Bitrix. Nest emituje zdarzenia domenowe za portem `AGENT_EVENTS`
(in-memory albo `eva_bot.agent_events`). Odczyt: `GET /v1/dashboard/summary`,
`/analytics`, `/sessions`, `/sessions/:id`, `/context-graph`, `/context-activity`,
`/container-log` za
`DASHBOARD_TOKEN`; CORS tylko
`DASHBOARD_ORIGIN`. `/context-graph` liczy w procesie pozycje MDS i krawędzie
k-NN (k = 3) z indeksu embeddingów już załadowanego do pamięci. Do przeglądarki
idą slug, tytuł i współrzędne — nie wektor 1536 i nie `body`.
`/context-activity?since=` zwraca wyłącznie `context_search`, `context_hit` i
`context_miss` (od `since` albo z bieżącej doby UTC). Widok grafu odtwarza
klatki sesji albo odpytuje tę trasę; nie jest to podgląd transkryptu na żywo.
`/container-log` oddaje bufor stdout tego procesu (w tym `[drzewo]`: ranking
gałęzi i liści oraz zgodność `lookup-leaf` z tym rankingiem, bez pytania
i bez `body`) oraz tury z eventów: `decision_trace`,
a gdy go nie ma — `intent_accepted`. Ślad dopasowany do linii już trzymanej w buforze
nie wraca przy kolejnym `after`. Kursor `after` większy niż ostatnia linia
bufora (restart procesu) zwraca bufor od nowa. `since` dotyczy tur już oddanych.
Bez treści wiadomości.
Payload eventów bez treści wiadomości. KPI doby z
eventów, nie z tekstu agenta. Zachowanie:
`docs/product-specs/evapremium-agents-dashboard.md`.
Plan: `docs/exec-plans/completed/evapremium-agents-dashboard.md`.
Konwersja sklepu i lift widgetu — poza tym zakresem.

## Późniejsze warstwy (nie implementować w MVP)

Sprzedaż w czacie, koszyk, zwroty, VIN, live-handoff, pełne konto klienta,
chunki FAQ w prompcie, RAG na szablonach/cenniku. Narzędzia i integracje
dokładane, gdy pojawi się konkretna potrzeba.

## Sesja czatu

MVP zapisuje **sesję i wiadomości** w Supabase (debug + kontekst). Kolejka dla
pracownika to **zapis do CRM Bitrix24**, nie panel w tym repo i nie sam e-mail.

NestJS woła REST Bitrix i tworzy encję **Lead** (`crm.lead.add` lub równoważne).
W Leadzie: telefon/mail, opis auta, id sesji. Cały transkrypt zostaje w Supabase,
nie kopiujemy go do CRM.

Telefon lub e-mail zbieramy **tylko przy leadzie** (brak szablonu, brak liścia
w context tree, prośba o oddzwonienie). FAQ i wycena mogą być anonimowe. Bez kontaktu i bez zgody lead nie powstaje w
Bitrix24 — nie obiecujemy oddzwonienia. W widgecie zawsze krótka informacja o
zapisie rozmowy.

## Otwarte pytania

- Treść liści `chat-zapis` i `zgoda-lead` — wklejenie ze sklepu, nie projekt
  architektury.
- Plan wykonania MVP: `docs/exec-plans/completed/mvp-tdd.md`.
- Dashboard operatora: `docs/exec-plans/completed/evapremium-agents-dashboard.md`.
- Które slugi context tree mapują się na `delivery` vs `after_sales` vs
  `product_info` — przy wypełnianiu profili, nie przy zmianie kaskady.
- RAG FAQ: indeks, embedder Nest, tool `search-leaves` i skrypt ingestu w
  kodzie. Apply pgvector na PROD tylko za zgodą. Mechanizm:
  `docs/design-docs/context-tree-rag.md`. Plan:
  `docs/exec-plans/completed/context-tree-rag.md`.
- Ranking slugów (hit@1): baza cosine 2026-09-15 i cele rury —
  `docs/eval/leaf-retrieval-metrics.md`. Projekt:
  `docs/design-docs/context-leaf-hybrid-retrieval.md`,
  `docs/exec-plans/completed/context-leaf-hybrid-retrieval.md`.

## Zasady utrzymania

- Opisuj stabilne granice, nie każdy plik źródłowy.
- Nie opisuj planu jako już wdrożonego kodu.
- Aktualizuj ten dokument w tej samej zmianie, która zmienia granice.
- Szczegóły zachowania: `docs/product-specs/`. Szczegóły uzasadnień:
  `docs/design-docs/`.

## Dokumenty powiązane

- `AGENTS.md`
- `DOCUMENTATION_STRUCTURE.md`
- `docs/DEPLOY.md`
- `docs/design-docs/core-beliefs.md`
- `docs/design-docs/intent-workflow.md`
- `docs/design-docs/context-tree-rag.md`
- `docs/design-docs/context-leaf-hybrid-retrieval.md`
- `docs/exec-plans/completed/intent-workflow.md`
- `docs/SECURITY.md`
- `docs/exec-plans/completed/mvp-tdd.md`
- `docs/references/mastra/INDEX.md`
- `docs/product-specs/mvp-obsluga-klienta.md`
- `docs/product-specs/evapremium-agents-dashboard.md`
- `docs/exec-plans/completed/evapremium-agents-dashboard.md`
