# Struktura dokumentacji projektu

## Cel

Ten dokument definiuje docelową strukturę wiedzy przeznaczonej dla ludzi i
agentów AI. Jest mapą rozwoju dokumentacji, a nie poleceniem utworzenia wszystkich
elementów od razu.

## Zasada nadrzędna

Opcjonalny plik lub katalog utwórz dopiero wtedy, gdy:

1. wynika z rzeczywistej potrzeby biznesowej, technicznej albo operacyjnej,
2. ma konkretną zawartość i odbiorcę,
3. wiadomo, przy jakich zmianach powinien być aktualizowany.

Nie twórz pustych katalogów, dokumentów zastępczych ani kopii wiedzy dostępnej już
w innym źródle.

## Elementy wymagane od początku

```text
AGENTS.md
ARCHITECTURE.md
DOCUMENTATION_STRUCTURE.md
```

- `AGENTS.md` — punkt wejścia dla agenta: kolejność poznawania repozytorium,
  zasady pracy, planowania i weryfikacji.
- `ARCHITECTURE.md` — aktualna architektura wysokiego poziomu oraz granice
  systemu. Dopóki nie ma kodu, opisuje zaakceptowane granice MVP i uczciwie
  brak implementacji.
- `DOCUMENTATION_STRUCTURE.md` — niniejsza mapa, która opisuje elementy opcjonalne
  i kryteria ich tworzenia.

## Docelowa struktura opcjonalna

Poniższe elementy nie są wymagane, dopóki nie pojawi się uzasadniająca je potrzeba:

```text
docs/
├── design-docs/
│   ├── index.md
│   ├── core-beliefs.md
│   └── ...
├── exec-plans/
│   ├── active/
│   ├── completed/
│   └── tech-debt-tracker.md
├── generated/
│   └── db-schema.md
├── product-specs/
│   ├── index.md
│   ├── new-user-onboarding.md
│   └── ...
├── references/
│   ├── design-system-reference-llms.txt
│   ├── nixpacks-llms.txt
│   ├── uv-llms.txt
│   └── ...
├── DESIGN.md
├── FRONTEND.md
├── PLANS.md
├── PRODUCT_SENSE.md
├── QUALITY_SCORE.md
├── RELIABILITY.md
└── SECURITY.md
```

## `docs/design-docs/`

Dokumenty projektowe opisujące sposób rozwiązania większych problemów
technicznych.

- `index.md` — indeks dokumentów projektowych, przydatny po pojawieniu się wielu
  dokumentów.
- `core-beliefs.md` — trwałe przekonania i zasady projektowe wpływające na
  decyzje w całym systemie.
- Pozostałe pliki — projekty konkretnych funkcji, modułów lub zmian
  architektonicznych.

Utwórz ten katalog, gdy implementacja wymaga decyzji wykraczającej poza prostą
zmianę kodu.

## `docs/exec-plans/`

Plany wykonania złożonych, wieloetapowych lub ryzykownych prac.

- `active/` — plany aktualnie realizowane.
- `completed/` — zakończone plany stanowiące historię wykonania.
- `tech-debt-tracker.md` — świadomie przyjęty dług techniczny, jego wpływ,
  priorytet i warunki usunięcia.

Utwórz odpowiednią część dopiero wraz z pierwszym rzeczywistym planem lub
zarejestrowanym długiem technicznym.

## `docs/generated/`

Dokumentacja wytwarzana automatycznie na podstawie źródła prawdy.

- `db-schema.md` — wygenerowany opis schematu bazy danych.

Każdy plik powinien wskazywać generator i źródło danych. Nie edytuj plików
generowanych ręcznie.

## `docs/product-specs/`

Specyfikacje opisujące oczekiwane zachowanie produktu i uzasadnienie biznesowe.

- `index.md` — indeks specyfikacji, potrzebny przy większej ich liczbie.
- `new-user-onboarding.md` — przykład specyfikacji procesu wdrożenia nowego
  użytkownika.
- Pozostałe pliki — osobne funkcje lub procesy biznesowe.

Utwórz specyfikację, gdy wymagania, przypadki brzegowe lub kryteria akceptacji nie
są oczywiste bez osobnego opisu.

## `docs/references/`

Wersjonowane materiały referencyjne potrzebne agentom podczas implementacji.

- `design-system-reference-llms.txt` — komponenty, API i reguły systemu
  projektowego.
- `nixpacks-llms.txt` — dokumentacja używanej wersji Nixpacks.
- `uv-llms.txt` — dokumentacja używanej wersji narzędzia `uv`.
- Pozostałe pliki — skondensowane materiały dotyczące faktycznie używanych
  technologii.

Dodaj materiał tylko wtedy, gdy technologia jest używana, wiedza nie jest łatwo
dostępna w repozytorium i lokalna kopia ogranicza błędy lub niejednoznaczność.
Zapisuj źródło oraz wersję materiału, aby można było ocenić jego aktualność.

## Dokumenty przekrojowe w `docs/`

- `DESIGN.md` — system wizualny, komponenty UI, dostępność i reguły projektowania.
- `FRONTEND.md` — architektura frontendu, zarządzanie stanem, routing i konwencje.
- `PLANS.md` — standard tworzenia, realizacji i zamykania planów wykonawczych.
- `PRODUCT_SENSE.md` — zasady podejmowania decyzji produktowych.
- `QUALITY_SCORE.md` — zdefiniowane kryteria i sposób mierzenia jakości.
- `RELIABILITY.md` — odporność, monitoring, obsługa błędów, odtwarzanie i SLO/SLA.
- `SECURITY.md` — model zagrożeń, dane wrażliwe, uwierzytelnianie, autoryzacja i
  wymagania bezpieczeństwa.

Każdy z tych dokumentów utwórz dopiero wtedy, gdy jego temat występuje w projekcie
i nie jest wystarczająco opisany w aktualnych dokumentach.

## Rozwój i utrzymanie

- Przy dodaniu nowego typu dokumentacji zaktualizuj tę mapę.
- Przy zmianie architektury aktualizuj `ARCHITECTURE.md`.
- Przy zmianie zasad pracy aktualizuj `AGENTS.md`.
- Usuwaj lub archiwizuj wiedzę, która przestała obowiązywać.
- Preferuj odnośniki do jednego źródła prawdy zamiast powielania treści.
- W przeglądzie zmiany sprawdzaj kod i powiązaną dokumentację jako jeden zakres.
