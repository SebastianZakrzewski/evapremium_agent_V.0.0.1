# Przegląd doby dashboardu

### `dashboard-overview-001` — bramka bez tokenu

- **Kod:** `dashboard/src/App.test.tsx` → `it('shows the token gate when no dashboard token is stored')`
- **Krytyczność:** high
- **Logika:** Dashboard nie może pokazać danych operatora przed podaniem osobnego sekretu dashboardu.
- **Wejście:** pusty `sessionStorage`, render aplikacji.
- **Wyjście:** formularz z polem „Token dostępu”; brak widoku „Przegląd doby”.

### `dashboard-overview-002` — cztery hipotezy i skrót naruszeń

- **Kod:** `dashboard/src/App.test.tsx` → `it('loads four hypotheses and a violation snippet with bearer auth')`
- **Krytyczność:** high
- **Logika:** Przegląd doby prezentuje liczby zwrócone przez API dla czterech hipotez, bez wyprowadzania ich z tekstu agenta. Żądanie używa sekretu operatora w nagłówku Bearer.
- **Wejście:** token `dashboard-secret` w `sessionStorage`, data `2026-09-13`, fake `fetch` ze znanym podsumowaniem i naruszeniem.
- **Wyjście:** liczby Odciążenia, Wyceny, Prawdy i Leada, tekst `session-risk-7` / `quote_without_cascade_one` oraz wywołanie `/v1/dashboard/summary?date=2026-09-13` z `Authorization: Bearer dashboard-secret`.

### `dashboard-overview-003` — token ograniczony do sesji przeglądarki

- **Kod:** `dashboard/src/App.test.tsx` → `it('stores the pasted token for this browser session')`
- **Krytyczność:** medium
- **Logika:** Sekret wpisany w bramce trafia do `sessionStorage`, a nie trwałego magazynu ani kodu widgetu.
- **Wejście:** token `new-secret` wpisany do pustej bramki i fake odpowiedź podsumowania.
- **Wyjście:** `eva-dashboard-token` ma wartość `new-secret`, a aplikacja otwiera przegląd doby.
