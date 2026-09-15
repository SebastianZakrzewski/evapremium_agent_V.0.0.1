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
- **Wejście:** `createSession` z `greeting` + chip `Dopasowanie do auta`
- **Wyjście:** `postMessage(..., 'Chcę dobrać dywaniki EVA do mojego auta.')`; brak chipów po kliku
