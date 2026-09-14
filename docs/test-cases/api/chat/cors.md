# CORS czatu

Kod: `tests/api/chat/shop-cors.spec.ts`  
Standard: [docs/test-cases/README.md](../../README.md)

Logika zestawu: originy sklepu + opcjonalny `WIDGET_ORIGIN` (HTTPS). Bez `*`.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| cors-001 | high | Sklep + origin widgetu HTTPS |
| cors-002 | high | HTTP widget odrzucony |

### cors-001 — Sklep + origin widgetu HTTPS

- **Kod:** `tests/api/chat/shop-cors.spec.ts` → `it('keeps shop origins and appends https widget origin')`
- **Krytyczność:** high
- **Logika:** iframe z Vercel musi mieć origin na liście CORS (TD-009).
- **Wejście:** `https://evabot.vercel.app/`
- **Wyjście:** sklep + `https://evabot.vercel.app` (bez końcowego slash)

### cors-002 — HTTP widget odrzucony

- **Kod:** `tests/api/chat/shop-cors.spec.ts` → `it('ignores http widget origins')`
- **Krytyczność:** high
- **Logika:** mixed content / IP HTTP nie rozszerza CORS.
- **Wejście:** `http://46.224.75.64:3000`
- **Wyjście:** tylko originy sklepu
