# Budżet tur czatu

Kod: `tests/api/chat/session-turn-budget.spec.ts`,
`tests/api/chat/supabase-session-turn-budget.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: publiczny czat nie woła modelu po przekroczeniu 25 wiadomości
sesji, 40 wiadomości gościa albo 10 nowych sesji gościa na godzinę UTC.
Skrót IP nie jest adresem. Powitanie asystenta się nie liczy.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| budget-001 | high | 25. tura sesji, 26. odmowa |
| budget-002 | medium | Powitanie nie liczy tury sesji |
| budget-003 | high | Godzina UTC zeruje wiadomości gościa |
| budget-004 | high | 10 sesji gościa na godzinę |
| budget-005 | high | Jedna z dwóch rezerwacji na ostatniej jednostce |
| budget-006 | high | Puste IP albo sól bez skrótu |
| budget-007 | medium | Próg 0 i ujemny odrzucony przy starcie |
| budget-008 | high | Ta sama księga na adapterze Supabase |

### budget-001 — 25. tura sesji, 26. odmowa

- **Kod:** `tests/api/chat/session-turn-budget.spec.ts` → `it('accepts the 25th session message and rejects the 26th without raising the counter')`
- **Krytyczność:** high
- **Logika:** 26. wiadomość sesji nie zwiększa licznika.
- **Wejście:** 26 razy `reserveSessionTurn('session-1')` przy progu 25
- **Wyjście:** pierwsze 25 `true`, 26. `false`, licznik zostaje 25

### budget-002 — Powitanie nie liczy tury sesji

- **Kod:** `tests/api/chat/session-turn-budget.spec.ts` → `it('does not count an assistant greeting as a session turn')`
- **Krytyczność:** medium
- **Logika:** rezerwacja nowej sesji gościa nie podbija licznika wiadomości sesji.
- **Wejście:** `reserveGuestSession` dla `203.0.113.10`
- **Wyjście:** `sessionTurnCount('session-1')` = 0

### budget-003 — Godzina UTC zeruje wiadomości gościa

- **Kod:** `tests/api/chat/session-turn-budget.spec.ts` → `it('resets the guest message bucket on the next UTC hour and keeps the session counter')`
- **Krytyczność:** high
- **Logika:** kubełek wiadomości gościa jest godzinny; licznik sesji żyje przez całą sesję.
- **Wejście:** 5 tur sesji, 40 tur gościa o `2026-10-04T01:15:00Z`, potem `02:00:00Z`
- **Wyjście:** 41. w tej samej godzinie `false`; pierwsza w nowej godzinie `true`; licznik sesji zostaje 5

### budget-004 — 10 sesji gościa na godzinę

- **Kod:** `tests/api/chat/session-turn-budget.spec.ts` → `it('accepts the 10th guest session and rejects the 11th in the same UTC hour')`
- **Krytyczność:** high
- **Logika:** 11. sesja gościa w tej samej godzinie UTC nie wchodzi do księgi.
- **Wejście:** 11 razy `reserveGuestSession` o `01:15Z`, potem raz o `02:00Z`
- **Wyjście:** 10 razy `true`, 11. `false` i licznik 10; nowa godzina znów `true`

### budget-005 — Jedna z dwóch rezerwacji na ostatniej jednostce

- **Kod:** `tests/api/chat/session-turn-budget.spec.ts` → `it('lets only one of two parallel reserves pass on the last session unit')`
- **Krytyczność:** high
- **Logika:** równoległe rezerwacje przy stanie 24 schodzą jedną jednostkę.
- **Wejście:** 24 rezerwacje, potem `Promise.all` dwóch kolejnych
- **Wyjście:** dokładnie jedna `true`, licznik 25

### budget-006 — Puste IP albo sól bez skrótu

- **Kod:** `tests/api/chat/session-turn-budget.spec.ts` → `it('denies an empty IP or empty salt and stores no guest hash')`
- **Krytyczność:** high
- **Logika:** bez IP albo bez soli księga nie zapisuje skrótu gościa.
- **Wejście:** sól pusta albo IP puste / same spacje
- **Wyjście:** `false`, zero kubełków; skrót nie zawiera surowego IP

### budget-007 — Próg 0 i ujemny odrzucony przy starcie

- **Kod:** `tests/api/chat/session-turn-budget.spec.ts` → `it('rejects a zero or negative limit and defaults when the variable is absent')`
- **Krytyczność:** medium
- **Logika:** brak zmiennej zostawia 25 / 40 / 10; `0` i wartość ujemna wywracają odczyt env.
- **Wejście:** pusty env, `CHAT_SESSION_TURN_LIMIT=0`, `CHAT_IP_TURN_LIMIT=-3`, sól wymagana i pusta
- **Wyjście:** domyślne progi albo wyjątek z nazwą zmiennej

### budget-008 — Ta sama księga na adapterze Supabase

- **Kod:** `tests/api/chat/supabase-session-turn-budget.spec.ts` → `it('keeps the in-memory budget contract on the data-store adapter')`
- **Krytyczność:** high
- **Logika:** adapter `usage_buckets` i `user_turns` trzyma te same progi co księga w pamięci. W wierszu jest skrót, nie adres.
- **Wejście:** `MemoryDataStore` z wierszem `chat_sessions`, te same progi i godziny co budget-001–004
- **Wyjście:** 26. tura `false`, 41. wiadomość gościa `false`, nowa godzina `true`, 11. sesja `false`, brak surowego IP w kubełku
