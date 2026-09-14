# HTTP Mastry dla Studio

Kod: `tests/api/mastra/studio-http.spec.ts`

Logika zestawu: `/mastra` nie jest publicznym czatem. Montaż tylko z
DeepSeek + tokenem. CORS Studio to localhost (i HTTPS extra), nie dowolne HTTP.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| studio-http-001 | high | Montaż tylko z kluczem i tokenem |
| studio-http-002 | high | CORS localhost gdy HTTP włączony |
| studio-http-003 | high | Extra HTTPS OK, publiczne HTTP nie |
| studio-http-004 | medium | GET feedback → pusta lista (LibSQL) |

### studio-http-001 — Montaż tylko z kluczem i tokenem

- **Kod:** `tests/api/mastra/studio-http.spec.ts` → `it('mounts only when DeepSeek and studio token are both set')`
- **Krytyczność:** high
- **Logika:** Bez tokena nie wystawiamy generate/tooli na `:3000`.
- **Wejście:** puste env / tylko DeepSeek / tylko token / oba
- **Wyjście:** `true` wyłącznie przy obu; prefix `/mastra`

### studio-http-002 — CORS localhost gdy HTTP włączony

- **Kod:** `tests/api/mastra/studio-http.spec.ts` → `it('adds localhost Studio origins only when HTTP is enabled')`
- **Krytyczność:** high
- **Logika:** Przeglądarka Studio (`localhost:4111`) musi być na liście CORS; bez montażu lista pusta.
- **Wejście:** `httpEnabled` false / true
- **Wyjście:** `[]` albo originy `http://localhost:4111` i `:3000`

### studio-http-003 — Extra HTTPS OK, publiczne HTTP nie

- **Kod:** `tests/api/mastra/studio-http.spec.ts` → `it('accepts extra https Studio origin and rejects public http')`
- **Krytyczność:** high
- **Logika:** `MASTRA_STUDIO_ORIGIN` nie może otworzyć CORS na `http://evil`.
- **Wejście:** `https://studio.example.com/` vs `http://evil.example.com`
- **Wyjście:** HTTPS w liście; HTTP obce nie

### studio-http-004 — GET feedback → pusta lista (LibSQL)

- **Kod:** `tests/api/mastra/studio-http.spec.ts` → `it('returns an empty feedback page because LibSQL cannot list feedback')`
- **Krytyczność:** medium
- **Logika:** Studio polluje `/mastra/observability/feedback`; LibSQL rzuca 500; zwracamy pustą stronę.
- **Wejście:** GET vs POST; `mode=delta`
- **Wyjście:** GET match; POST nie; `{ feedback: [] }` + pagination albo sam `feedback` w delta
