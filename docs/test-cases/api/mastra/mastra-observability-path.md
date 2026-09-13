# Ścieżka DuckDB observablity Mastry

Kod: `api/src/mastra/mastra-observability-path.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: wykresy Studio nie idą do LibSQL; plik DuckDB leży obok
`mastra.db` / `editor.db`, chyba że env nadpisze ścieżkę.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| mastra-obs-path-001 | high | DuckDB obok pliku LibSQL |
| mastra-obs-path-002 | medium | Override ścieżki i prefix `file:` |
| mastra-obs-path-003 | low | Fallback przy pamięci LibSQL |

### mastra-obs-path-001 — DuckDB obok pliku LibSQL

- **Kod:** `api/src/mastra/mastra-observability-path.spec.ts` → `it('puts DuckDB next to the LibSQL file')`
- **Krytyczność:** high
- **Logika:** na VPS oba pliki muszą trafić na ten sam wolumen `/data`.
- **Wejście:** `file:/data/mastra.db` oraz `file:.mastra/editor.db`
- **Wyjście:** `/data/observability.duckdb` oraz `.mastra/observability.duckdb`

### mastra-obs-path-002 — Override ścieżki i prefix `file:`

- **Kod:** `api/src/mastra/mastra-observability-path.spec.ts` → `it('uses MASTRA_OBSERVABILITY_PATH and strips a file: prefix')`
- **Krytyczność:** medium
- **Logika:** env i opcja konstruktora wygrywają z siblingiem; DuckDB nie używa prefiksu `file:`.
- **Wejście:** `MASTRA_OBSERVABILITY_PATH=/data/custom.duckdb`; `file:/tmp/obs.duckdb`
- **Wyjście:** ścieżki bez `file:`

### mastra-obs-path-003 — Fallback przy pamięci LibSQL

- **Kod:** `api/src/mastra/mastra-observability-path.spec.ts` → `it('falls back when LibSQL is in-memory')`
- **Krytyczność:** low
- **Logika:** `file::memory:` nie ma katalogu siblinga.
- **Wejście:** `file::memory:`
- **Wyjście:** `.mastra/observability.duckdb`
