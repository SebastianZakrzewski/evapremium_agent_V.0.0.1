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
6. **Graf kontekstu** — hash `#/graf`. Mapa aktywnych liści z embeddingiem:
   pozycja z MDS, krawędzie k-NN (k = 3), liczone w Neście. Odpowiedź: slug,
   tytuł, współrzędne i podobieństwo krawędzi. Bez wektora i bez `body`.
   Panel rysuje to jako obracający się atlas 3D (kora, móżdżek, pień):
   węzły na powierzchni, krawędzie jako ścieżki. Przeciągnięcie obraca widok,
   kółko przybliża.
   Odtwarzanie sesji zapala klatkę `context_search` / `context_hit` /
   `context_miss`. „Na żywo” odpytuje `GET /v1/dashboard/context-activity`
   co około 2 s i pokazuje najnowszą klatkę drzewa, bez transkryptu.
   Pod mapą jest log kontenera: te same wpisy co stdout Nest
   (`[intent-turn]` z wierszami było / kandydat / przyjęto / sub-intencja /
   tryb / wykonanie / cel / narzędzia / zakres, `[drzewo]` z doboru gałęzi
   i liści oraz `użyte narzędzie`).
   `[drzewo]` po `search-leaves`: gałęzie preferowane z sub-intencji, ranking
   gałęzi (top 3), kolejność liści i pewność (`wysoka` / `niejednoznaczna`).
   `[drzewo]` po `lookup-leaf`: slug, trafienie albo pudło, zgodność z tym
   rankingiem (`#1`, `w rankingu`, `poza rankingiem`). Bez pytania i bez `body`.
   Oś sesji pokazuje `decision_trace` tymi samymi polami.
   `GET /v1/dashboard/container-log` czyta bufor procesu (ostatnie 200 linii).
   Gdy bufor jest pusty albo proces wystartował od nowa, dokłada tury z eventów:
   `decision_trace`, a przy jego braku `intent_accepted`. Ślad już wpięty w linię
   bufora nie pojawia się drugi raz przy kolejnym odpytaniu. Bez treści wiadomości.

## Poza 0.0.1

Kolejka Bitrix, UI Studio / traces Mastry, Sentry w panelu, alerty, CSV,
wyszukiwanie pełnotekstowe, koszt tokenów, oceny LLM, role/SSO, live-tail
transkryptu, CTA do konfiguratora, zszycie z zamówieniem, eksperyment konwersji.

## Kryteria akceptacji

- KPI doby liczą się z eventów Nest, nie z parsowania tekstu agenta.
- Cena na osi tylko gdy istnieje `quote_issued` (fakt z macierzy).
- Transkrypt i eventy tej samej sesji w jednym widoku, w kolejności czasu.
- Widget sklepu nie woła API dashboardu.
- `/mastra` nie jest panelem KPI.
- Bez sekretu brak odczytu sesji i transkryptu.
- Graf kontekstu nie zwraca wektorów ani `body`. Podświetlenie węzła bierze się
  ze zdarzeń drzewa, nie z tekstu odpowiedzi agenta.

## Źródła

Zachowanie agenta: `docs/product-specs/mvp-obsluga-klienta.md`.
Granice systemu: `ARCHITECTURE.md`.
Plan wykonania: `docs/exec-plans/active/evapremium-agents-dashboard.md`.
