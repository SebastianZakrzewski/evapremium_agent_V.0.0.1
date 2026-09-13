# Plan: dashboard operatora agenta (MVP 0.0.1)

Cel: pakiet `dashboard/` na **Vercel** + zdarzenia domenowe w Nest, żeby
operator produktu weryfikował cztery hipotezy agenta na żywym ruchu.

Źródła: `ARCHITECTURE.md`, `docs/product-specs/evapremium-agents-dashboard.md`,
`docs/product-specs/mvp-obsluga-klienta.md`, `docs/SECURITY.md`.

Zasada: **jeden slice na iterację**; czerwony test → kod → `npm run verify`.
Bez testu nie ma zapisu eventu, API odczytu ani ekranu KPI. Merge na `main`
przed następnym slice. Apply migracji na PROD tylko za zgodą.

Nazwa tabeli eventów **nie jest decyzją produktową**. Roboczo:
`eva_bot.agent_events` (append-only). Kształt JSON payloadu ustala Slice 1
w teście, byle były typy ze specyfikacji.

## Poza tym planem

Checkout, konwersja sklepu, A/B widgetu, Studio, kolejka leadów, RAG, role
użytkowników, alerty, CSV, apply PROD bez zgody.

## Slice 1 — port zdarzeń i emisja (in-memory)

Test: po kaskadzie 0/1/N, wycenie z macierzy, hicie/missie drzewa, próbie
leada (zgoda vs brak) oraz akceptacji intencji pojawia się event danego typu;
treść wiadomości nie jest w paylodzie.
Kod: port + adapter in-memory; haki w istniejących serwisach Nest / przygotowaniu
tury. Bez HTTP dashboardu, bez UI.

## Slice 2 — persystencja w `eva_bot`

Test: ten sam kontrakt co in-memory, zapis do tabeli (fixture / fake store);
odczyt listy po `session_id` i zakresie czasu.
Kod: migracja w repozytorium; adapter Supabase za portem. **Bez apply na PROD.**

## Slice 3 — API odczytu

Test: bez `Authorization: Bearer` → 401; z `DASHBOARD_TOKEN` → podsumowanie
doby, lista sesji ze znacznikami, jedna sesja (wiadomości + eventy). Origin
poza `DASHBOARD_ORIGIN` → brak CORS. Widgetowy kontrakt `/v1/sessions` bez zmian.
Kod: wąskie GET-y w Nest. Token ≠ `MASTRA_STUDIO_TOKEN`.

## Slice 4 — pakiet `dashboard/`: przegląd doby

Test: przy znanych eventach UI (lub test renderu) pokazuje liczby czterech
hipotez i skrót naruszeń.
Kod: workspace `dashboard/` (React), osobny origin. `npm run verify` obejmuje
nowy pakiet. Auth sekretem. Bez listy sesji w tym slice, jeśli nie jest
potrzebna do samego przeglądu — lista jest Slice 5.

## Slice 5 — lista sesji i widok sesji

Test: znaczniki z eventów, nie z tekstu; widok sesji składa transkrypt
`direction`/`text` z osią eventów w czasie.
Kod: dwa ekrany ze specyfikacji. Bez full-text, bez CSV.

## Slice 6 — deploy Vercel

Osobny projekt Vercel (inny origin niż widget sklepu). Env: URL API Hetzner,
origin dashboardu po stronie Nest (`DASHBOARD_ORIGIN`), `DASHBOARD_TOKEN` na
Nest i w konfiguracji UI (tylko do wywołań API, nie w publicznym czacie).
Smoke: zalogowany operator widzi dobę i jedną sesję fixture/PROD **tylko za
zgodą na odczyt PROD**. CORS i sekret bez wycieku do snippetu.

## Definicja końca

Spełnione kryteria w `evapremium-agents-dashboard.md`. KPI z eventów Nest.
Dashboard na Vercel ≠ `/mastra`. `verify` zielone; wpisy w `docs/test-cases/`.
