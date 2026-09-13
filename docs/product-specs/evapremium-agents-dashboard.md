# MVP 0.0.1: dashboard operatora agenta

Wewnętrzny panel **evapremium_agents_dashboard**: weryfikacja, czy agent na
produkcji realizuje logikę biznesową i założenia MVP wobec żywych klientów.
Nie jest to Mastra Studio, kolejka leadów ani analityka sprzedaży sklepu.
UI: osobny origin na **Vercel**. API odczytu: Nest na Hetznerze.
Aktualizuj przy zmianie zachowania dashboardu.

## Aktorzy

- Operator produktu (pierwszy użytkownik 0.0.1): przegląd doby i zejście do sesji.
- Klient sklepu i pracownik Bitrix — bez kont w dashboardzie.

## Cel biznesowy

Po ruchu na `evapremium.pl` operator ma powiedzieć „spełnione / nie / za mało
danych” dla czterech hipotez agenta:

1. **Odciążenie** — część sesji kończy się wyceną albo faktem z drzewa, bez leada.
2. **Wycena** — kwota tylko przy kaskadzie = 1 i wariancie z listy kategorii;
   0 i N nie dają ceny.
3. **Prawda** — FAQ z liścia context tree; miss nie kończy się zmyślonym faktem.
4. **Lead** — Bitrix tylko przy kontakcie i zgodzie; brak obietnicy oddzwonienia
   bez leada.

Konwersja sklepu (zamówienie, lift widget on/off) jest **poza** tą specyfikacją.

## Funkcje 0.0.1

1. **Zdarzenia domenowe** — Nest dopisuje fakty przy turze / toolu (nie treść
   wiadomości). Typy: `intent_accepted`, `cascade_resolved` (0/1/N),
   `quote_issued`, `context_hit`, `context_miss`, `lead_attempted`,
   `tool_failed`.
2. **Przegląd doby** — liczby pod cztery hipotezy, filtr daty, skrót sesji
   z naruszeniem założeń.
3. **Lista sesji** — znaczniki z eventów (intencja, kaskada, wycena, drzewo,
   lead, naruszenie). Filtr: data + jeden wymiar.
4. **Widok sesji** — transkrypt (`chat_messages`) obok osi zdarzeń Nest.
5. **Wejście** — jeden sekret dashboardu, inny niż `MASTRA_STUDIO_TOKEN`.

## Poza 0.0.1

Kolejka Bitrix, UI Studio / traces Mastry, Sentry w panelu, alerty, CSV,
wyszukiwanie pełnotekstowe, koszt tokenów, oceny LLM, role/SSO, live-tail,
CTA do konfiguratora, zszycie z zamówieniem, eksperyment konwersji.

## Kryteria akceptacji

- KPI doby liczą się z eventów Nest, nie z parsowania tekstu agenta.
- Cena na osi tylko gdy istnieje `quote_issued` (fakt z macierzy).
- Transkrypt i eventy tej samej sesji w jednym widoku, w kolejności czasu.
- Widget sklepu nie woła API dashboardu.
- `/mastra` nie jest panelem KPI.
- Bez sekretu brak odczytu sesji i transkryptu.

## Źródła

Zachowanie agenta: `docs/product-specs/mvp-obsluga-klienta.md`.
Granice systemu: `ARCHITECTURE.md`.
Plan wykonania: `docs/exec-plans/active/evapremium-agents-dashboard.md`.
