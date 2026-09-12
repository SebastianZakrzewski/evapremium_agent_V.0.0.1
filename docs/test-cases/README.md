# Katalog przypadków testowych

Źródło prawdy o **przypadkach** (co i dlaczego testujemy). Kod wykonywalny
zostaje w `api/` i `widget/` (`*.spec.ts`, `*.test.ts(x)`). Ten katalog nie
zastępuje Jest/Vitest.

Odbiorca: agent kodujący i człowiek przeglądający zmianę.

Aktualizuj ten katalog **w tej samej zmianie**, która dodaje, zmienia albo
usuwa test.

## Obowiązek agenta

Każdy nowy test w repozytorium **musi** dostać wpis w tym katalogu, w tym
samym standardzie co istniejące przypadki. Bez opisu test nie jest kompletny.

1. Dodaj lub zmień test w pakiecie (`api` / `widget` / przyszłe workspace).
2. Utwórz lub zaktualizuj plik w podkatalogu odpowiadającym obszarowi.
3. Wypełnij wszystkie pola standardu (poniżej).
4. Dopisz wiersz w indeksie tego pliku `README.md`, jeśli to nowy zestaw.

Nie kopiuj całego kodu testu. Opisz kontrakt: wejście, wyjście, logikę,
krytyczność, ścieżkę do `it(...)`.

## Układ podkatalogów

```text
docs/test-cases/
├── README.md                 ← ten standard
├── api/
│   ├── domain/               ← czysta logika (bez Nest / HTTP)
│   ├── templates/            ← serwis kaskady / porty
│   ├── pricing/              ← serwis wyceny / porty
│   ├── context-tree/         ← serwis liści FAQ / porty
│   ├── chat/                 ← kontrakt HTTP czatu
│   ├── lead/                 ← Bitrix lead / fake HTTP
│   └── observability/        ← Sentry na API
└── widget/                   ← UI widgetu i snippet sklepu
```

Nowy obszar (wycena, context tree, HTTP, Bitrix, snippet) = nowy podkatalog
w `api/`, `widget/` albo na tym samym poziomie, gdy pojawi się trzeci pakiet.
Nie twórz pustego folderu „na zapas”.

## Standard opisu przypadku

Każdy przypadek w pliku zestawu:

```markdown
### `<id>` — krótki tytuł

- **Kod:** `ścieżka/do/pliku.spec.ts` → `it('...')`
- **Krytyczność:** critical | high | medium | low
- **Logika:** którą regułę systemu to strzeże (jedno–dwa zdania)
- **Wejście:** sloty / stan / fixture (konkretne wartości)
- **Wyjście:** oczekiwany kontrakt (status, id, tekst UI, błąd)
```

`id`: `{obszar}-{nnn}`, np. `cascade-003`. Numeruj w obrębie zestawu.

## Krytyczność

| Poziom | Kiedy |
| --- | --- |
| **critical** | Błąd oznacza złą cenę, zły szablon pod wycenę, zmyślony fakt albo lead bez zgody. |
| **high** | Błąd łamie kaskadę 0 / 1 / N albo inną regułę „fetch, nie zgaduj”. |
| **medium** | Wiring, normalizacja, aliasy — bez tego kontrakt domeny jest kruchy, ale sam nie podaje kwoty. |
| **low** | Szkielet, smoke UI, brak zachowania produktowego. |

Przy wątpliwości wybierz wyższy poziom.

## Indeks zestawów

| Zestaw | Podkatalog | Kod |
| --- | --- | --- |
| Kaskada szablonu (domena) | [api/domain/template-cascade.md](api/domain/template-cascade.md) | `api/src/domain/template-cascade.spec.ts` |
| Wycena (domena) | [api/domain/pricing.md](api/domain/pricing.md) | `api/src/domain/pricing.spec.ts` |
| Context tree (domena) | [api/domain/context-tree.md](api/domain/context-tree.md) | `api/src/domain/context-tree.spec.ts` |
| Lead Bitrix (domena) | [api/domain/lead.md](api/domain/lead.md) | `api/src/domain/lead.spec.ts` |
| Resolver kaskady | [api/templates/template-cascade-resolver.md](api/templates/template-cascade-resolver.md) | `api/src/templates/template-cascade.resolver.spec.ts` |
| Resolver wyceny | [api/pricing/pricing-resolver.md](api/pricing/pricing-resolver.md) | `api/src/pricing/pricing.resolver.spec.ts` |
| Resolver context tree | [api/context-tree/context-tree-resolver.md](api/context-tree/context-tree-resolver.md) | `api/src/context-tree/context-tree.resolver.spec.ts` |
| Kontrakt HTTP czatu | [api/chat/chat-http.md](api/chat/chat-http.md) | `api/src/chat/chat.contract.spec.ts` |
| CORS czatu | [api/chat/cors.md](api/chat/cors.md) | `api/src/chat/shop-cors.spec.ts` |
| Sesje Supabase | [api/chat/supabase-sessions.md](api/chat/supabase-sessions.md) | `api/src/chat/supabase-chat-sessions.spec.ts` |
| Resolver leada | [api/lead/lead-resolver.md](api/lead/lead-resolver.md) | `api/src/lead/lead.resolver.spec.ts` |
| Sentry na API | [api/observability/sentry.md](api/observability/sentry.md) | `api/src/observability/init-sentry.spec.ts` |
| Adapter szablonów Supabase | [api/templates/supabase-catalog.md](api/templates/supabase-catalog.md) | `api/src/templates/supabase/load-catalog.spec.ts` |
| Adapter cennika Supabase | [api/pricing/supabase-pricing.md](api/pricing/supabase-pricing.md) | `api/src/pricing/supabase/load-pricing.spec.ts` |
| Adapter context tree Supabase | [api/context-tree/supabase-nodes.md](api/context-tree/supabase-nodes.md) | `api/src/context-tree/supabase/load-nodes.spec.ts` |
| Widget czat (wycena i miss) | [widget/chat-ui.md](widget/chat-ui.md) | `widget/src/chat/ChatPanel.test.tsx`, `format-turn.test.ts`, `App.test.tsx` |
| Snippet sklepu | [widget/snippet.md](widget/snippet.md) | `widget/src/embed/shop-snippet.test.ts` |
