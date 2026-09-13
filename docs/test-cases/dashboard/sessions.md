# Sesje dashboardu

### `dashboard-sessions-001` — znaczniki wyłącznie z eventów

- **Kod:** `dashboard/src/App.test.tsx` → `it('shows markers supplied by event-backed fixture instead of message text')`
- **Krytyczność:** high
- **Logika:** Lista renderuje wyłącznie znaczniki zwrócone przez eventowe API. Tekst wiadomości nie może utworzyć znacznika; filtr przekazuje do API jeden wybrany wymiar.
- **Wejście:** token `dashboard-secret`, data `2026-09-13`, odpowiedź listy z markerem `tree` i dodatkowym tekstem wiadomości zawierającym słowa „wycena” oraz „lead”.
- **Wyjście:** w wierszu sesji widoczny jest tylko znacznik „Drzewo”, tekst wiadomości nie trafia na listę, a wybór wymiaru wywołuje `/v1/dashboard/sessions?date=2026-09-13&marker=tree` z Bearer.

### `dashboard-sessions-002` — transkrypt i chronologiczna oś eventów

- **Kod:** `dashboard/src/App.test.tsx` → `it('shows transcript with timed events and amount only for quote_issued')`
- **Krytyczność:** critical
- **Logika:** Szczegół łączy transkrypt z eventami uporządkowanymi po `occurredAt`. Kwota jest faktem z `quote_issued`; pole `amount` innego eventu nie może zostać pokazane jako cena.
- **Wejście:** sesja `session-quote`, wiadomości inbound/outbound oraz nieuporządkowane eventy `tool_failed` z `amount: 999` i `quote_issued` z `amount: 599`, `currency: PLN`.
- **Wyjście:** oba teksty transkryptu, oś „Wydano wycenę” przed „Błąd narzędzia”, widoczne `599 PLN`, brak `999` oraz GET szczegółu z Bearer.
