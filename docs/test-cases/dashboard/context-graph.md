# Graf kontekstu w dashboardzie

### `dashboard-graph-001` — węzły z API i zapalona klatka search/hit

- **Kod:** `tests/dashboard/App.test.tsx` → `it('draws mocked leaves and lights search and hit slugs on the next frame')`
- **Krytyczność:** high
- **Logika:** widok `#/graf` rysuje liście zwrócone przez Nest i podświetla ścieżkę tury ze zdarzeń sesji: kandydat wyszukiwania słabiej, trafienie mocniej. Podświetlenie nie pochodzi z tekstu wiadomości.
- **Wejście:** token `dashboard-secret`, hash `#/graf`, graf z węzłami `kolory` i `material-eva`, sesja `session-tree` ze `context_search` (`kolory`, `material-eva`) i `context_hit` (`material-eva`)
- **Wyjście:** tytuły obu liści, po „Następna klatka” stany `candidate` i `hit`, odcinek ścieżki, GET `/v1/dashboard/context-graph` z Bearer
