# Katalog przypadków testowych

Źródło prawdy o **przypadkach** (co i dlaczego testujemy). Kod wykonywalny
testów jest w katalogu `tests/` (Jest/Vitest + `node --test` dla deployu).
Ten katalog nie zastępuje runnerów.

Odbiorca: agent kodujący i człowiek przeglądający zmianę.

Aktualizuj ten katalog **w tej samej zmianie**, która dodaje, zmienia albo
usuwa test.

## Obowiązek agenta

Każdy nowy test w repozytorium **musi** dostać wpis w tym katalogu, w tym
samym standardzie co istniejące przypadki. Bez opisu test nie jest kompletny.

1. Dodaj lub zmień test w `tests/api/`, `tests/widget/` lub `tests/dashboard/`.
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
│   ├── agent-events/         ← zdarzenia domenowe dashboardu
│   ├── dashboard/            ← odczyt KPI / sesji
│   ├── lead/                 ← Bitrix lead / fake HTTP
│   ├── mastra/               ← IntentProfile / workflow intencji
│   └── observability/        ← Sentry na API
├── deploy/                   ← skrypt aktualizacji kontenera na VPS
├── widget/                   ← UI widgetu i snippet sklepu
└── dashboard/                ← UI panelu operatora
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
| Kaskada szablonu (domena) | [api/domain/template-cascade.md](api/domain/template-cascade.md) | `tests/api/domain/template-cascade.spec.ts` |
| Wycena (domena) | [api/domain/pricing.md](api/domain/pricing.md) | `tests/api/domain/pricing.spec.ts` |
| Context tree (domena) | [api/domain/context-tree.md](api/domain/context-tree.md) | `tests/api/domain/context-tree.spec.ts` |
| Wyszukiwanie liści (domena) | [api/domain/context-leaf-search.md](api/domain/context-leaf-search.md) | `tests/api/domain/context-leaf-search.spec.ts` |
| Lead Bitrix (domena) | [api/domain/lead.md](api/domain/lead.md) | `tests/api/domain/lead.spec.ts` |
| Resolver kaskady | [api/templates/template-cascade-resolver.md](api/templates/template-cascade-resolver.md) | `tests/api/templates/template-cascade.resolver.spec.ts` |
| Resolver wyceny | [api/pricing/pricing-resolver.md](api/pricing/pricing-resolver.md) | `tests/api/pricing/pricing.resolver.spec.ts` |
| Resolver context tree | [api/context-tree/context-tree-resolver.md](api/context-tree/context-tree-resolver.md) | `tests/api/context-tree/context-tree.resolver.spec.ts` |
| IntentProfile (rejestr) | [api/mastra/intent-profiles.md](api/mastra/intent-profiles.md) | `tests/api/mastra/intents/intent-profile.spec.ts` |
| Kwalifikator intencji | [api/mastra/intent-qualifier.md](api/mastra/intent-qualifier.md) | `tests/api/mastra/intents/intent-qualifier.spec.ts` |
| Gałąź tury (tool-e) | [api/mastra/intent-turn.md](api/mastra/intent-turn.md) | `tests/api/mastra/intents/prepare-intent-turn.spec.ts` |
| Fallback intencji i lead | [api/mastra/intent-fallback.md](api/mastra/intent-fallback.md) | `tests/api/mastra/intents/intent-fallback.spec.ts` |
| Pamięć intencji sesji | [api/mastra/intent-session-memory.md](api/mastra/intent-session-memory.md) | `tests/api/mastra/intents/accept-intent-transition.spec.ts` |
| Log tury intencji | [api/mastra/intent-turn-log.md](api/mastra/intent-turn-log.md) | `tests/api/mastra/intents/intent-turn-log.spec.ts` |
| Request context tury | [api/mastra/eva-turn-request-context.md](api/mastra/eva-turn-request-context.md) | `tests/api/mastra/eva-turn-request-context.spec.ts` |
| Katalog shop-tooli Mastry | [api/mastra/shop-tool-catalog.md](api/mastra/shop-tool-catalog.md) | `tests/api/mastra/tools/shop-tool-catalog.spec.ts` |
| Prompt-blocks tury | [api/mastra/prompt-block-instructions.md](api/mastra/prompt-block-instructions.md) | `tests/api/mastra/prompt-block-instructions.spec.ts` |
| HTTP Mastry (Studio) | [api/mastra/studio-http.md](api/mastra/studio-http.md) | `tests/api/mastra/studio-http.spec.ts` |
| Ścieżka DuckDB observability | [api/mastra/mastra-observability-path.md](api/mastra/mastra-observability-path.md) | `tests/api/mastra/mastra-observability-path.spec.ts` |
| Query orderBy Studio | [api/mastra/coerce-mastra-query.md](api/mastra/coerce-mastra-query.md) | `tests/api/mastra/coerce-mastra-query.spec.ts` |
| Agent czatu Mastra | [api/chat/mastra-chat-agent.md](api/chat/mastra-chat-agent.md) | `tests/api/chat/mastra-chat.agent.spec.ts` |
| Kontrakt HTTP czatu | [api/chat/chat-http.md](api/chat/chat-http.md) | `tests/api/chat/chat.contract.spec.ts` |
| Zdarzenia domenowe agenta | [api/agent-events/agent-events.md](api/agent-events/agent-events.md) | `tests/api/agent-events/agent-events.spec.ts` |
| Persystencja zdarzeń agenta | [api/agent-events/agent-events-store.md](api/agent-events/agent-events-store.md) | `tests/api/agent-events/supabase-agent-events.spec.ts` |
| API odczytu dashboardu | [api/dashboard/dashboard-api.md](api/dashboard/dashboard-api.md) | `tests/api/dashboard/dashboard-read.spec.ts` |
| CORS czatu | [api/chat/cors.md](api/chat/cors.md) | `tests/api/chat/shop-cors.spec.ts` |
| Sesje Supabase | [api/chat/supabase-sessions.md](api/chat/supabase-sessions.md) | `tests/api/chat/supabase-chat-sessions.spec.ts` |
| Resolver leada | [api/lead/lead-resolver.md](api/lead/lead-resolver.md) | `tests/api/lead/lead.resolver.spec.ts` |
| Sentry na API | [api/observability/sentry.md](api/observability/sentry.md) | `tests/api/observability/init-sentry.spec.ts`, `tests/api/observability/report-unexpected-error.spec.ts`, `tests/api/observability/sentry-debug-probe.spec.ts` |
| Adapter szablonów Supabase | [api/templates/supabase-catalog.md](api/templates/supabase-catalog.md) | `tests/api/templates/supabase/load-catalog.spec.ts` |
| Adapter cennika Supabase | [api/pricing/supabase-pricing.md](api/pricing/supabase-pricing.md) | `tests/api/pricing/supabase/load-pricing.spec.ts` |
| Adapter context tree Supabase | [api/context-tree/supabase-nodes.md](api/context-tree/supabase-nodes.md) | `tests/api/context-tree/supabase/load-nodes.spec.ts` |
| Embeddings liści (pgvector / OpenAI) | [api/context-tree/embeddings.md](api/context-tree/embeddings.md) | `tests/api/context-tree/embeddings/*.spec.ts`, `tests/api/domain/context-leaf-ingest.spec.ts`, `tests/api/scripts/ingest-context-leaves.test.mjs` |
| Widget czat (wycena i miss) | [widget/chat-ui.md](widget/chat-ui.md) | `tests/widget/chat/ChatPanel.test.tsx`, `tests/widget/chat/format-turn.test.ts`, `tests/widget/App.test.tsx` |
| Snippet sklepu | [widget/snippet.md](widget/snippet.md) | `tests/widget/embed/shop-snippet.test.ts` |
| Dashboard — przegląd doby | [dashboard/overview.md](dashboard/overview.md) | `tests/dashboard/App.test.tsx` |
| Dashboard — sesje | [dashboard/sessions.md](dashboard/sessions.md) | `tests/dashboard/App.test.tsx` |
| Aktualizacja kontenera API | [deploy/update-container.md](deploy/update-container.md) | `tests/deploy/update-container.test.mjs` |
| Vercel dashboard (bez proxy czatu) | [deploy/dashboard-vercel.md](deploy/dashboard-vercel.md) | `tests/deploy/dashboard-vercel.test.mjs` |
| Obraz Docker Studio | [deploy/studio-image.md](deploy/studio-image.md) | `tests/deploy/studio.test.mjs` |
| Studio → Nest produkcyjny | [api/mastra/studio-prod.md](api/mastra/studio-prod.md) | `tests/api/scripts/studio-prod.test.mjs` |
