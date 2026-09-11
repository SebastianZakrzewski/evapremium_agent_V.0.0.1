# Widget — snippet sklepu

Kod: `widget/src/embed/shop-snippet.test.ts`  
Standard: [docs/test-cases/README.md](../README.md)

Logika zestawu: sklep ładuje skrypt z originu widgetu (CDN); w HTML jest tylko
publiczny `data-eva-widget`, bez sekretów serwera.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| snippet-001 | high | Publiczny id i src z originu widgetu |
| snippet-002 | high | embed.js bez sekretów |

### snippet-001 — Publiczny id i src z originu widgetu

- **Kod:** `widget/src/embed/shop-snippet.test.ts` → `it('exposes a public widget id and loads the script from the widget origin')`
- **Krytyczność:** high
- **Logika:** snippet nie jest kluczem API; identyfikator jest publiczny.
- **Wejście:** `shopEmbedSnippet('https://widget.example.cdn')`
- **Wyjście:** `data-eva-widget="eva-shop"`, `src` wskazuje `/embed.js` na tym originie, brak markerów sekretów

### snippet-002 — embed.js bez sekretów

- **Kod:** `widget/src/embed/shop-snippet.test.ts` → `it('keeps embed.js free of server secrets')`
- **Krytyczność:** high
- **Logika:** skrypt CDN nie może zawierać kluczy Nest / Bitrix / DeepSeek.
- **Wejście:** treść `widget/public/embed.js`
- **Wyjście:** atrybut `data-eva-widget`; brak `DEEPSEEK_API_KEY`, `BITRIX_WEBHOOK`, `service_role`, `SENTRY_DSN`
