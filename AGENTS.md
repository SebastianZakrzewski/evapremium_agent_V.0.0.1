# AGENTS.md

## Cel

Ten plik jest punktem wejścia dla agentów pracujących w repozytorium. Zawiera zasady
poznawania projektu, wprowadzania zmian i utrzymywania dokumentacji.

## Kolejność poznawania projektu

1. Przeczytaj `AGENTS.md`.
2. Przeczytaj `ARCHITECTURE.md`.
3. Przeczytaj `DOCUMENTATION_STRUCTURE.md`.
4. Przy pracy nad produktem lub agentem: `docs/design-docs/core-beliefs.md`
   oraz `docs/product-specs/mvp-obsluga-klienta.md`.
   Przy API, originach, sekretach lub PII: `docs/SECURITY.md`.
5. Otwórz tylko pozostałe dokumenty związane z wykonywanym zadaniem.
   Implementacja MVP: `docs/exec-plans/active/mvp-tdd.md`.
   Mastra: `docs/references/mastra/INDEX.md`, potem jeden fragment.
6. Przed zmianą kodu sprawdź istniejące wzorce i testy.
   Katalog przypadków (wejście / wyjście / logika / krytyczność):
   `docs/test-cases/README.md`.

## Zasady pracy

- Wprowadzaj najmniejszą kompletną zmianę rozwiązującą zadanie.
- Nie refaktoryzuj kodu niezwiązanego z zadaniem.
- Zachowuj publiczne API i kontrakty danych, jeśli zadanie nie wymaga ich zmiany.
- Nie zakładaj, że element opisany w docelowej strukturze dokumentacji już istnieje.
- Opcjonalny dokument lub katalog twórz tylko wtedy, gdy wynika to z rzeczywistej
  potrzeby biznesowej, technicznej albo operacyjnej.
- Nie twórz pustych katalogów ani dokumentów z treścią zastępczą.
- Wraz ze zmianą zachowania systemu aktualizuj powiązaną dokumentację.
- Wyraźnie oznaczaj dokumentację generowaną i nie edytuj jej ręcznie.
- **Każdy nowy lub zmieniony test** opisz w `docs/test-cases/` w standardzie
  z `docs/test-cases/README.md` (opis, wejście, wyjście, logika, krytyczność,
  ścieżka do `it(...)`). Test bez tego wpisu nie jest kompletny.

## Plany wykonawcze

Większe, wieloetapowe lub ryzykowne zadania powinny otrzymać plan w
`docs/exec-plans/active/`. Po zakończeniu i weryfikacji plan należy przenieść do
`docs/exec-plans/completed/`.

Nie twórz infrastruktury planów dla prostych, jednorazowych zmian.

## Weryfikacja

Przed uznaniem zadania za zakończone uruchom kontrole odpowiednie do zmienionego
obszaru, w szczególności testy, lint, kontrolę typów i build, jeśli są dostępne.

Kanoniczna weryfikacja z katalogu głównego: `npm run verify`
(test + lint + typecheck w workspace’ach `api` i `widget`).
Skrót tylko do testów: `npm test`.

Po dodaniu testu zaktualizuj odpowiadający zestaw w `docs/test-cases/`.

## Utrzymanie dokumentacji

Każdy dokument powinien:

- odpowiadać na konkretną potrzebę,
- mieć jasno określony zakres,
- wskazywać źródło prawdy, jeśli opisuje dane generowane,
- być aktualizowany razem ze zmianą, której dotyczy.

Docelowa mapa dokumentacji i warunki tworzenia jej elementów znajdują się w
`DOCUMENTATION_STRUCTURE.md`.
