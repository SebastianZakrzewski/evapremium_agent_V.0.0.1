# Core beliefs

Aktualizuj, gdy zmieni się trwała zasada projektowa, nie przy każdej funkcji.

## Produkt

- Najpierw działający MVP, nie duży system.
- MVP = obsługa klienta po **polsku**: informacja + wycena orientacyjna na widgetcie sklepu.
- Reszta (sprzedaż, zwroty, live-handoff) dopiero gdy MVP działa u klienta.

## Prawda i agent

- Cena i fakt sklepu pochodzą z fetcha, nigdy z parametrów modelu.
- Brak szablonu albo brak liścia w context tree = nie zgadujemy.
- Wycena w czacie nie jest ofertą wiążącą.
- Obietnica „odezwie się człowiek” wymaga leada w Bitrix24 (kontakt + zgoda),
  nie samej formułki.

## Budowa

- Warstwy i narzędzia dokładamy przy potrzebie; domyślnie minimalizm.
- Implementacja w TDD.
- Dokumentacja ma kompresować kontekst agenta: granice, zakazy, źródła prawdy.
- Mastra orkiestruje w tym samym procesie co Nest (DeepSeek Flash); NestJS
  egzekwuje HTTP, reguły, Supabase i Bitrix24.
- Panel KPI operatora (Vercel) nie jest Mastra Studio i nie zastępuje kolejki
  Bitrix; fakty do KPI pochodzą z eventów Nest, nie z tekstu LLM.
- Intencja tury: LLM tylko etykieta; `IntentProfile` to pakiet kontekstu
  wgrywany w runtime. `acceptIntentTransition` filtruje kandydata względem
  stanu sesji (`allowedTransitions`). Agent ze wszystkimi shop-toolami na raz
  jest zakazany.

## Odrzucone na MVP (nie wracać bez nowych faktów)

- Checkout / płatność w czacie.
- Wycena wiążąca 1:1 ze sklepem jako źródło w LLM.
- Ceny lub FAQ ze scrapingu strony.
- Identyfikacja auta po VIN / rejestracji.
- Konsultant na żywo w tym samym czacie.
- Własny panel leadów, sam e-mail jako kolejka, n8n jako hop do Bitrix na MVP
  (dashboard KPI nie jest kolejką).
- KPI sprzedaży / lift konwersji w dashboardzie agenta, dopóki nie ma mostu
  sesji czatu do zamówienia i eksperymentu na sklepie.
- Nest jako serverless (np. Vercel Functions) na MVP.
- PaaS (Railway / Render / Fly) zamiast Hetznera na MVP.
- Pliki widgetu z Hetznera na MVP (zostają na Vercel/CDN).
- Otwarte CORS albo sekret API w JavaScript widgecie.
- Osobny proces Mastry albo widget bijący w Mastrę / LLM.
- LLM piszący SQL, kwotę albo id szablonu.
- Embeddings / RAG na FAQ albo na szablonach na MVP.
- Wielojęzyczność agenta albo drugie drzewo EN na MVP.
- Cisza w UI przy zapisie transkryptu / leada albo pełny CMP zanim czat wstanie.
