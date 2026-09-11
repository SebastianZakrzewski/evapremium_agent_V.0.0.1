# ARCHITECTURE.md

## Stan implementacji

Szkielet monorepo (npm workspaces): `api/` (NestJS + Express, bez Mastry)
i `widget/` (React + Vite). Brak zachowania MVP (kaskada, wycena, HTTP czatu,
lead). Poniżej są **zaakceptowane granice MVP**, nie opis działającego produktu.

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

Kod w jednym gicie, pakiety `api` i `widget`. Deploy nadal rozdzielony
(Nest na Hetznerze, widget na Vercel/CDN).

| Warstwa | Technologia | Odpowiedzialność |
| --- | --- | --- |
| Prezentacja | React, hostowany widget | Snippet na `evapremium.pl`; UI czatu z Waszego originu |
| Agent / LLM | Mastra + DeepSeek | Orchestracja; język modelu `deepseek-flash` (linia V4 Flash) |
| Logika biznesowa | NestJS | Kaskada filtrów, wycena, context tree, utworzenie leada; jedyne I/O do danych i CRM |
| Dane | Supabase PROD | `evapremium_shop` (szablony, cennik), `eva_bot` (sesje, context tree) |
| CRM | Bitrix24 | Kolejka pracy człowieka (zapis leada z czatu) |
| Obserwowalność | Sentry | Błędy i analiza w produkcji |
| Jakość | TDD | Test najpierw, potem implementacja |

## Źródła danych

Projekt Supabase **PROD** (`kmepxyervpeujwvgdqtm`). Nest czyta schematy
serwerowo (nie anon z widgetu).

1. **Szablony:** `evapremium_shop.mat_templates` (~2756, aktywne szablony).
   Kaskada po `brand_key` / `model_key` / `body_type_*_key` / lata / `record_key`.
   Kategoria cennika: `dealer_pricing_category_key`.
2. **Cennik:** `pricing_vehicle_categories`, `pricing_variants`,
   `pricing_category_variants`, `pricing_matrix` (cena = kategoria + wariant +
   `mat_type`). Zakres: wszystkie szablony z tabeli, nie podzbiór „hitów”.
3. **Context tree:** `eva_bot.context_nodes` (do utworzenia). Kolumny: `id`,
   `parent_id` (NULL = korzeń), `slug`, `title`, `body` (puste u gałęzi, treść
   u liścia), `sort_order`, `is_active`. Nest schodzi po `slug` / rodzicu.
   **Bez RAG.** Wymagane liście na start: `chat-zapis` (informacja o transkrypcie),
   `zgoda-lead` (klauzula przy telefonie/mailu). **Treść prawną wkleja biznes**
   ze sklepu; agent jej nie generuje. Dalsze FAQ (dostawa, pielęgnacja, …) jako
   kolejne liście.
4. **Sesja czatu:** schemat `eva_bot` (`chat_sessions`, `chat_messages`; puste).

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
   / potwierdzenie sklepu.

Kategorie cennika (slug): `passenger_car`, `minivan`, `bus`, `pickup`,
`heavy_truck`, `passenger_car_legacy`. Typy maty w macierzy: `3d-with-rims`,
`classic`, `single`. Słownik wariantów: `pricing_variants` (`variant_key`,
`variant_label`). Źródło prawdy nazw jest w tabelach, nie w tym dokumencie.

LLM nie pisze SQL i nie podaje kwoty spoza wyniku narzędzia.

## Widget

Sklep wkleja **snippet** (skrypt). Widget z Vercel/CDN woła API Nest na Hetznerze.
CORS: tylko `evapremium.pl` i `www`. Publiczny id widgetu w snippecie, nie sekret.
Szczegóły: `docs/SECURITY.md`.

## LLM

Dostawca: **DeepSeek**. W Mastrze: `model: "deepseek/deepseek-v4-flash"`, env
`DEEPSEEK_API_KEY`. API DeepSeek: id `deepseek-flash` (V4.1-Flash). Klucz tylko
po stronie serwera. Model nie jest źródłem cen ani FAQ. Język MVP: **polski**.
Kontekst implementacji: `docs/references/mastra/`.

## Hosting

Widget: **statyczny na Vercel/CDN**. NestJS + Mastra: **jeden proces Node na
Hetznerze**. Snippet sklepu ładuje JS z CDN; czat woła API na Hetznerze.
Nie PaaS i nie serverless. Widget nie jest serwowany z VPS.

## Późniejsze warstwy (nie implementować w MVP)

Sprzedaż w czacie, koszyk, zwroty, VIN, live-handoff, pełne konto klienta,
RAG na context tree. Narzędzia i integracje dokładane, gdy pojawi się konkretna
potrzeba.

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
- Plan wykonania: `docs/exec-plans/active/mvp-tdd.md`.

## Zasady utrzymania

- Opisuj stabilne granice, nie każdy plik źródłowy.
- Nie opisuj planu jako już wdrożonego kodu.
- Aktualizuj ten dokument w tej samej zmianie, która zmienia granice.
- Szczegóły zachowania: `docs/product-specs/`. Szczegóły uzasadnień:
  `docs/design-docs/`.

## Dokumenty powiązane

- `AGENTS.md`
- `DOCUMENTATION_STRUCTURE.md`
- `docs/design-docs/core-beliefs.md`
- `docs/SECURITY.md`
- `docs/exec-plans/active/mvp-tdd.md`
- `docs/references/mastra/INDEX.md`
- `docs/product-specs/mvp-obsluga-klienta.md`
