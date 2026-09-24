# Graf kontekstu w dashboardzie

### `dashboard-graph-001` — węzły z API i zapalona klatka search/hit

- **Kod:** `tests/dashboard/App.test.tsx` → `it('draws mocked leaves and lights search and hit slugs on the next frame')`
- **Krytyczność:** high
- **Logika:** widok `#/graf` rysuje liście zwrócone przez Nest i podświetla ścieżkę tury ze zdarzeń sesji: kandydat wyszukiwania słabiej, trafienie mocniej. Podświetlenie nie pochodzi z tekstu wiadomości.
- **Wejście:** token `dashboard-secret`, hash `#/graf`, graf z węzłami `kolory` i `material-eva`, sesja `session-tree` ze `context_search` (`kolory`, `material-eva`) i `context_hit` (`material-eva`)
- **Wyjście:** tytuły obu liści, po „Następna klatka” stany `candidate` i `hit`, odcinek ścieżki, GET `/v1/dashboard/context-graph` z Bearer; pod grafem blok `[intent-turn]` (sesja, było, kandydat, przyjęto, narzędzia, zakres `w ofercie`), osobny ślad z `sub-intencja` `available_colors` i linia `użyte narzędzie: "search-leaves"`

### `dashboard-graph-003` — brak trasy logu nie zasłania grafu

- **Kod:** `tests/dashboard/App.test.tsx` → `it('keeps the container log empty when the API has no log route')`
- **Krytyczność:** medium
- **Logika:** starszy Nest bez `GET /v1/dashboard/container-log` zwraca 404. Panel logu zostaje pusty i nie pokazuje ogólnego błędu odczytu dashboardu.
- **Wejście:** token `dashboard-secret`, hash `#/graf`, graf z liściem `kolory`, `container-log` ze statusem 404
- **Wyjście:** widoczny „Kolory”, w logu „Brak linii w tym procesie.”, brak komunikatu „Nie udało się pobrać danych dashboardu”

### `dashboard-graph-002` — chwilowy błąd „Na żywo” znika po kolejnym odpytaniu

- **Kod:** `tests/dashboard/App.test.tsx` → `it('clears a live activity failure after the next poll succeeds')`
- **Krytyczność:** medium
- **Logika:** jedno nieudane `context-activity` pokazuje błąd, ale nie zostawia go na stałe, gdy następne odpytanie się udaje. Mapa liści zostaje.
- **Wejście:** token `dashboard-secret`, hash `#/graf`, graf z liściem `kolory`, pierwsze `context-activity` ze statusem 502, drugie z pustą listą
- **Wyjście:** alert „Nie udało się pobrać danych dashboardu. Spróbuj ponownie.”, potem brak alertu i nadal widoczny „Kolory”
