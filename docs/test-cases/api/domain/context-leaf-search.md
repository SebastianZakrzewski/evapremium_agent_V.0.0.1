# Wyszukiwanie liści (domena)

Kod: `api/src/domain/context-leaf-search.spec.ts`  
Fixture: `api/src/context-tree/in-memory/context-leaf-search-fixture.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: cosine powyżej progu + aktywny liść z niepustym `body` →
`{ slug, score }` bez `body`. Gałąź, nieaktywny, pusty body, niski score → `[]`.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| leaf-search-001 | critical | Parafraza dostawy → slug `dostawa` |
| leaf-search-002 | critical | VIN / gałąź / nieaktywny / puste body → pusto |

### leaf-search-001 — Parafraza dostawy → slug `dostawa`

- **Kod:** `api/src/domain/context-leaf-search.spec.ts` → `it('returns dostawa slug for a shipping paraphrase above threshold')`
- **Krytyczność:** critical
- **Logika:** podobieństwo wektorowe wskazuje liść; treść FAQ nie wraca w wyniku.
- **Wejście:** wektor zapytania `kiedy wyślecie dywaniki`, fixture, próg 0.8
- **Wyjście:** `[{ slug: 'dostawa', score >= 0.8 }]` bez `body`

### leaf-search-002 — VIN / gałąź / nieaktywny / puste body → pusto

- **Kod:** `api/src/domain/context-leaf-search.spec.ts` → `it('returns empty for unknown topic, branch, inactive leaf, and empty body')`
- **Krytyczność:** critical
- **Logika:** brak sąsiada albo węzeł niekwalifikowany = brak sluga, nie zmyślamy faktu.
- **Wejście:** wektory VIN, `info`, `archiwum-gwarancja`, `chat-zapis`
- **Wyjście:** `[]` w każdym przypadku
