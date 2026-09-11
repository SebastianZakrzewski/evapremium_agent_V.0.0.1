# Plan: MVP agenta (TDD)

Cel: widget na sklepie odpowiada z context tree i podaje wycenę orientacyjną
z `evapremium_shop`, z leadem w Bitrix przy braku szablonu.

Źródła: `ARCHITECTURE.md`, `docs/product-specs/mvp-obsluga-klienta.md`,
`docs/SECURITY.md`. Po weryfikacji przenieś ten plik do `completed/`.

Zasada: **czerwony test → implementacja → zielony**. Bez testu nie ma fetcha
ceny, drzewa ani Bitrix.

## Poza tym planem

Checkout, RAG, Deal zamiast Lead, RLS na n8n, treść prawna (wkleja biznes).

## Slice 0 — szkielet repo

Monorepo lub dwa pakiety: `api` (Nest + Mastra, Hetzner), `widget` (React, Vercel).
Kanoniczna komenda test/lint/typecheck — wpisać do `AGENTS.md` gdy powstanie.
Test: bootstrapped `npm test` / równoważne pada na pustym module domeny.

## Slice 1 — kaskada szablonu

Testy: sloty → alias → 0 / 1 / N wierszy `mat_templates` (fixture, bez LLM).
Kod: serwis Nest, tabela aliasów w `eva_bot` jeśli brak. LLM nie jest w teście.

## Slice 2 — wycena

Testy: przy znanym szablonie + `variant_key` (+ `mat_type` gdy dual) → jedna
kwota z `pricing_matrix`; brak wariantu na kategorii → błąd domeny, nie liczba.
Kod: lista z `pricing_category_variants`, lookup macierzy.

## Slice 3 — context tree

Migracja `eva_bot.context_nodes`. Testy: slug liścia zwraca `body`; brak liścia
→ miss. Seed pustych `chat-zapis`, `zgoda-lead` (body uzupełnia biznes).

## Slice 4 — HTTP + Mastra

Testy kontraktu API (sesja, wiadomość, narzędzia wołają serwisy z 1–3).
Mastra w procesie Nestu; DeepSeek za adapterem (w teście stub).
Widget → Nest; CORS origin sklepu.

## Slice 5 — sesja i lead

Testy: zapis `chat_sessions` / `chat_messages`; lead Bitrix tylko przy kontakcie
+ zgodzie; bez zgody brak `crm.lead.add`. Bitrix w teście: fake HTTP.

## Slice 6 — widget + snippet

Testy jednostkowe UI na ścieżce wyceny i miss. Osadzenie snippetu. Sentry na API.

## Slice 7 — deploy

Widget Vercel, API Hetzner, env (DeepSeek, Supabase service, Bitrix). Smoke:
jedno auto z szablonem → cena orientacyjna; nieznane auto → lead nie wychodzi
bez zgody.

## Definicja końca

Spełnione kryteria w `mvp-obsluga-klienta.md`. Agent nie podaje kwoty spoza
macierzy ani faktu spoza liścia.
