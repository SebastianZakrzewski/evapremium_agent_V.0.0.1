# Graf podobieństwa liści (domena)

Kod: `tests/api/domain/context-similarity-graph.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: aktywne liście z embeddingiem dostają pozycję MDS
(`1 - cosinus`) i krawędzie k-NN (k = 3). Odpowiedź ma slug, tytuł i
współrzędne. Nie ma wektora ani `body`. Gałąź i liść nieaktywny wypadają.
Pusty indeks → pusta mapa. Dwa wywołania na tych samych danych dają ten sam
układ.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| sim-graph-001 | high | Bliskie liście sąsiadują; bez wektora i body |
| sim-graph-002 | medium | Brak embeddingów → pusta mapa |

### sim-graph-001 — Bliskie liście sąsiadują; bez wektora i body

- **Kod:** `tests/api/domain/context-similarity-graph.spec.ts` → `it('places close leaves nearer than distant ones and omits vectors and body')`
- **Krytyczność:** high
- **Logika:** mapa operatora łączy liście według podobieństwa wektorów i nie wynosi indeksu ani faktu FAQ do odpowiedzi.
- **Wejście:** liście `alfa`…`epsilon` (alfa prawie równoległe do beta, epsilon ortogonalne do alfa), embedding gałęzi `info` i nieaktywnego `archiwum`
- **Wyjście:** węzły tylko pięciu aktywnych liści; odległość alfa–beta mniejsza niż alfa–epsilon; krawędź alfa–beta; brak krawędzi alfa–epsilon; brak `body` i wektora; drugie wywołanie równe pierwszemu

### sim-graph-002 — Brak embeddingów → pusta mapa

- **Kod:** `tests/api/domain/context-similarity-graph.spec.ts` → `it('returns an empty map when no leaf has an embedding')`
- **Krytyczność:** medium
- **Logika:** bez indeksu widok nie zmyśla sąsiedztwa.
- **Wejście:** katalog liści, pusta lista wektorów
- **Wyjście:** `{ nodes: [], edges: [] }`
