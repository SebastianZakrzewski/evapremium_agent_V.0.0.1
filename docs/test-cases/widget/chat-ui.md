# Widget — czat (wycena i miss)

Kod: `tests/widget/chat/ChatPanel.test.tsx`, `tests/widget/chat/format-turn.test.ts`,
`tests/widget/App.test.tsx`, `tests/widget/chat/consume-chat-sse.test.ts`  
Standard: [docs/test-cases/README.md](../README.md)

Logika zestawu: UI pokazuje kwotę z payloadu API i miss bez zmyślonej polityki.
Kwota nie pochodzi z modelu w widgecie.

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| widget-002 | critical | UI wyceny orientacyjnej |
| widget-003 | critical | UI miss bez zmyślonego FAQ |
| widget-004 | critical | format wyceny z payloadu |
| widget-005 | critical | format miss bez polityki |
| widget-006 | low | Chrome widgetu (zapis rozmowy) |
| widget-007 | high | UI tekstu `generated` z API |
| widget-008 | high | formatter `generated` → `text` |
| widget-009 | high | parser SSE: tokeny i `done` |
| widget-010 | high | UI dokłada tokeny z `onDelta` |
| widget-011 | high | Powitanie i chipy tematów |
| widget-012 | medium | Żywy status „pisze…” w nagłówku |
| widget-013 | low | Wyślij nieaktywny przy pustym drafcie |
| widget-014 | high | Karta produktu sklepu po marce i modelu |
| widget-015 | high | Limit tur wyłącza czat |
| widget-016 | medium | Inny błąd zostawia pole do edycji |

### widget-002 — UI wyceny orientacyjnej

- **Kod:** `tests/widget/chat/ChatPanel.test.tsx` → `it('shows an indicative quote from the API payload')`
- **Krytyczność:** critical
- **Logika:** widget nie liczy ceny; pokazuje `amount` z Nest (`quoted`).
- **Wejście:** mock API `{ status: 'quoted', amount: 599, currency: 'PLN' }`, wiadomość `golf 8 komplet`
- **Wyjście:** tekst `Wycena orientacyjna: 599 PLN. Cena ostateczna w konfiguratorze.` oraz informacja o zapisie rozmowy

### widget-003 — UI miss bez zmyślonego FAQ

- **Kod:** `tests/widget/chat/ChatPanel.test.tsx` → `it('shows a miss without inventing store policy')`
- **Krytyczność:** critical
- **Logika:** przy `status: miss` brak zmyślonej polityki sklepu.
- **Wejście:** mock `{ status: 'miss' }`, wiadomość `gwarancja xyz`
- **Wyjście:** komunikat o braku w wiedzy sklepu; brak tekstu w stylu `gwarancja dożywotnia`

### widget-004 — format wyceny z payloadu

- **Kod:** `tests/widget/chat/format-turn.test.ts` → `it('formats an indicative quote without inventing the amount')`
- **Krytyczność:** critical
- **Logika:** formatter tylko składa kwotę z `data`, nie zgaduje.
- **Wejście:** `{ status: 'quoted', amount: 599, currency: 'PLN' }`
- **Wyjście:** ten sam tekst wyceny orientacyjnej co w UI

### widget-005 — format miss bez polityki

- **Kod:** `tests/widget/chat/format-turn.test.ts` → `it('formats a miss without store policy copy')`
- **Krytyczność:** critical
- **Logika:** miss nie wstawia treści FAQ.
- **Wejście:** `{ status: 'miss' }`
- **Wyjście:** komunikat o braku wiedzy; brak `gwarancja dożywotnia`

### widget-006 — Chrome widgetu (zapis rozmowy)

- **Kod:** `tests/widget/App.test.tsx` → `it('renders the chat widget chrome')`
- **Krytyczność:** low
- **Logika:** klient widzi, że rozmowa jest zapisywana (wymóg produktu).
- **Wejście:** render `<App />` z mock API
- **Wyjście:** nagłówek `EvaBot`, `EVA Premium` i tekst `Rozmowa jest zapisywana.`

### widget-007 — tekst Mastry (`generated`)

- **Kod:** `tests/widget/chat/ChatPanel.test.tsx` → `it('shows generated assistant text from the API')`
- **Krytyczność:** high
- **Logika:** `MastraChatAgent` zwraca `data.status: generated` i treść w `text`; UI nie zastępuje jej błędem sieci.
- **Wejście:** mock `{ status: 'generated' }` oraz `text` z API
- **Wyjście:** ten sam `text` na liście wiadomości

### widget-008 — formatter `generated` → `text`

- **Kod:** `tests/widget/chat/format-turn.test.ts` → `it('shows Mastra generated text when status is not quoted or miss')`
- **Krytyczność:** high
- **Logika:** quoted/miss z payloadu; pozostałe statusy pokazują `text` z Nestu.
- **Wejście:** `{ text: 'Wycena orientacyjna z macierzy: 599 PLN.', data: { status: 'generated' } }`
- **Wyjście:** ten sam string, bez komunikatu błędu

### widget-009 — parser SSE

- **Kod:** `tests/widget/chat/consume-chat-sse.test.ts` → `it('calls onDelta for tokens and returns the done payload')`
- **Krytyczność:** high
- **Logika:** UI nie czeka na cały JSON; tokeny z `delta`, kontrakt z `done`.
- **Wejście:** strumień SSE `Komplet ` + `dywaników` + `done`
- **Wyjście:** `onDelta` dwa razy; `text` złożony, `status: generated`

### widget-010 — UI tokenów SSE

- **Kod:** `tests/widget/chat/ChatPanel.test.tsx` → `it('streams generated assistant tokens from SSE deltas')`
- **Krytyczność:** high
- **Logika:** `postMessage` woła `onDelta`; pęcherzyk asystenta pokazuje złożony tekst.
- **Wejście:** mock `onDelta('Komplet ')`, `onDelta('dywaników')`
- **Wyjście:** `Komplet dywaników` na liście wiadomości

### widget-011 — Powitanie i chipy tematów

- **Kod:** `tests/widget/chat/ChatPanel.test.tsx` → `it('opens a session with greeting chips and sends the chip message')`
- **Krytyczność:** high
- **Logika:** widget otwiera sesję przy montażu; klik chipa wysyła kanoniczną wiadomość i chowa tematy. Tekst powitania z API, nie z modelu w UI.
- **Wejście:** `createSession` z `greeting` + chip `Szablon pod markę i model?`
- **Wyjście:** `postMessage(..., 'Czy macie dywaniki EVA dopasowane do mojej marki, modelu i rocznika?')`; brak chipów po kliku

### widget-012 — Żywy status „pisze…” w nagłówku

- **Kod:** `tests/widget/chat/ChatPanel.test.tsx` → `it('shows a live typing status while the assistant is answering')`
- **Krytyczność:** medium
- **Logika:** agent ma wyglądać na obecnego: w spoczynku nagłówek pokazuje „Online”, a od wysłania wiadomości do końca odpowiedzi — „pisze…” oraz wskaźnik pisania w pęcherzyku asystenta.
- **Wejście:** `postMessage` zwraca obietnicę rozwiązywaną ręcznie; wiadomość `golf 8 komplet`
- **Wyjście:** przed odpowiedzią `pisze…` i element `aria-label="Pisze"`; po rozwiązaniu tekst `Gotowe.`, brak `pisze…`, ponownie `Online`

### widget-013 — Wyślij nieaktywny przy pustym drafcie

- **Kod:** `tests/widget/chat/ChatPanel.test.tsx` → `it('keeps the send button disabled until the draft has text')`
- **Krytyczność:** low
- **Logika:** przycisk wysyłki (ikona, `aria-label="Wyślij"`) aktywuje się dopiero, gdy draft ma treść poza białymi znakami.
- **Wejście:** pusty draft, potem `'   '`, potem `golf 8`
- **Wyjście:** disabled, disabled, enabled

### widget-014 — Karta produktu sklepu po marce i modelu

- **Kod:** `tests/widget/chat/ChatPanel.test.tsx` → `it('shows the shop product card after the agent verifies brand and model')`, `tests/widget/chat/shop-product-card.test.ts`
- **Krytyczność:** high
- **Logika:** po weryfikacji marki i modelu UI wstawia kartę sklepu z `cardUrl`. Adres karty jest ze sklepu, nie z modelu.
- **Wejście:** `?cardUrl=https://shop.example/dywaniki?brand={brand}`, payload `product` dla Audi A4
- **Wyjście:** iframe `Karta produktu` o `src` `https://shop.example/dywaniki?brand=audi`

### widget-015 — Limit tur wyłącza czat

- **Kod:** `tests/widget/chat/ChatPanel.test.tsx` → `it('stops the panel when the turn budget is spent')`
- **Krytyczność:** high
- **Logika:** 429 `turn_budget_exceeded` zostawia stały tekst, wyłącza pole i chipy i nie ponawia żądania.
- **Wejście:** `postMessage` rzuca `TurnBudgetExceededError`, potem drugie kliknięcie Wyślij
- **Wyjście:** tekst limitu, pole i chip wyłączone, `postMessage` raz

### widget-016 — Inny błąd zostawia pole do edycji

- **Kod:** `tests/widget/chat/ChatPanel.test.tsx` → `it('keeps the composer editable after a network error')`
- **Krytyczność:** medium
- **Logika:** błąd sieci nie jest limitem tur.
- **Wejście:** `postMessage` rzuca `Error('network')`
- **Wyjście:** `Nie udało się dokończyć tej odpowiedzi.` i pole znowu aktywne

Uwaga: `widget/src/setup.ts` ustawia `MotionGlobalConfig.skipAnimations`, bo jsdom nie ma klatek animacji i animacje wyjścia trzymałyby węzły w DOM. Zniknięcie elementów (`AnimatePresence`) jest nadal asynchroniczne, więc asercje „brak w DOM” w widget-011 i widget-012 idą przez `waitFor`.
