# Plan: MVP agenta (TDD)

Cel: widget na sklepie odpowiada z context tree i podaje wycenę orientacyjną
z `evapremium_shop`, z leadem w Bitrix przy braku szablonu.

Źródła: `ARCHITECTURE.md`, `docs/product-specs/mvp-obsluga-klienta.md`,
`docs/SECURITY.md`. Slice’e 0–7 zamknięte; ten plik jest w `completed/`.

Zasada: **czerwony test → implementacja → zielony**. Bez testu nie ma fetcha
ceny, drzewa ani Bitrix.

Bramka pętli (jeden slice, (zrobione) = nie ruszaj, merge przed następnym,
PROD dopiero w Slice 7, audyt przez osobnego subagenta):
`.cursor/rules/mvp-tdd-quality-gate.mdc`.

## Poza tym planem

Checkout, RAG, Deal zamiast Lead, RLS na n8n, treść prawna (wkleja biznes).

## Slice 0 — szkielet repo (zrobione)

Monorepo npm workspaces: `api/` (Nest, Hetzner; Mastra w Slice 4), `widget/`
(React/Vite, Vercel). Kanoniczna komenda: `npm run verify` (`AGENTS.md`).
Stub domeny zastąpiony kaskadą w Slice 1.

## Slice 1 — kaskada szablonu (zrobione)

Testy: sloty → alias → 0 / 1 / N wierszy `mat_templates` (fixture, bez LLM).
Kod: `TemplateCascadeService`, porty in-memory. SQL `eva_bot.vehicle_slot_aliases`
w repo, bez apply na PROD. LLM nie jest w teście.

## Slice 2 — wycena (zrobione)

Testy: przy znanym szablonie + `variant_key` (+ `mat_type` gdy dual) → jedna
kwota z `pricing_matrix`; brak wariantu na kategorii → błąd domeny, nie liczba.
Kod: lista z `pricing_category_variants`, lookup macierzy. Katalogi in-memory
(dług TD-001); bez HTTP.

## Slice 3 — context tree (zrobione)

Migracja `eva_bot.context_nodes`. Testy: slug liścia zwraca `body`; brak liścia
→ miss. Seed pustych `chat-zapis`, `zgoda-lead` (body uzupełnia biznes).
Katalog in-memory (dług TD-002); bez apply PROD.

## Slice 4 — HTTP + Mastra (zrobione)

Testy kontraktu API (sesja, wiadomość, narzędzia wołają serwisy z 1–3).
Mastra w procesie Nestu; DeepSeek za adapterem (w teście stub).
Widget → Nest; CORS origin sklepu. Dług TD-003–005.

## Slice 5 — sesja i lead (zrobione)

Testy: zapis `chat_sessions` / `chat_messages`; lead Bitrix tylko przy kontakcie
+ zgodzie; bez zgody brak `crm.lead.add`. Bitrix w teście: fake HTTP.
Migracja w repo, transkrypt in-memory (TD-006); webhook Fetch tylko z env
(TD-007).

## Slice 6 — widget + snippet (zrobione)

Testy jednostkowe UI na ścieżce wyceny i miss. Osadzenie snippetu. Sentry na API.
Dług TD-008 (Mastra `generated`+`text`), TD-009 (origin iframe vs CORS sklepu).

## Slice 7 — deploy (zrobione)

Widget Vercel (`https://widget-xi-eight.vercel.app`, rewrite `/v1` → API),
Nest na Hetzner (`http://46.224.75.64:3000`), env DeepSeek / Supabase service /
Bitrix. Adaptery za portami; bez env — fixture (`verify`). Smoke: Golf 8 → kwota
PLN z `pricing_matrix`; lead bez zgody — testy domeny (brak `crm.lead.add`).
Runbook: `docs/DEPLOY.md`.

## Definicja końca

Spełnione kryteria w `mvp-obsluga-klienta.md`. Agent nie podaje kwoty spoza
macierzy ani faktu spoza liścia.
