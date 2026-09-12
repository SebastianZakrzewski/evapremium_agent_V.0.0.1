# Workflow intencji (Mastra)

Źródło prawdy granic: `ARCHITECTURE.md`. Ten dokument: kontrakt profili i
przepływ tury. Implementacja: `docs/exec-plans/completed/intent-workflow.md`.

## Cel

`IntentProfile` to **ustrukturyzowany kontekst tury**: nie stały system
prompt, tylko pakiet wgrywany agentowi w runtime po kwalifikacji zapytania
(instrukcja, tool-e, limity, uprawnienia).

Stany maszyny = `ShopIntent`. Krawędzie = `routing.allowedTransitions` na
profilu **bieżącego** stanu. LLM nazywa kandydata na następny stan; workflow
**akceptuje albo odrzuca** przejście — nie prompt.

Na **każdą** wiadomość użytkownika workflow Mastry:

1. kwalifikuje intencję (LLM, zero shop-tooli),
2. filtruje kandydata przez `allowedTransitions` (albo pierwszy stan sesji),
3. wgrywa profil tej intencji do agenta tury i odpala pętlę z jego toolami.

Widget i `ChatController` nie klasyfikują. `ShopTools` nie klasyfikują.

## Kontrakt `IntentProfile`

Interfejs (TypeScript) — jedną klasą na intencję, bez pól `!` bez wartości.

```ts
export type ShopIntent =
  | 'product_info'
  | 'pricing'
  | 'delivery'
  | 'after_sales'
  | 'out_of_scope';

export type IntentExecution = {
  mode: 'agent_loop';
  maxToolCalls: number;
};

export type IntentPermissions = {
  allowedActions: string[];
  forbiddenActions: string[];
};

export type IntentRouting = {
  allowIntentSwitch: boolean;
  allowedTransitions: ShopIntent[];
};

export type IntentFallback = {
  onLowConfidence: 'reclassify';
  onToolFailure: 'retry' | 'out_of_scope';
  onUnknownCase: 'out_of_scope';
};

export interface IntentProfile {
  readonly id: ShopIntent;
  readonly context: string;
  readonly instructions?: string;
  readonly tools: string[];
  readonly execution: IntentExecution;
  readonly permissions: IntentPermissions;
  readonly routing?: IntentRouting;
  readonly fallback: IntentFallback;
}
```

`intentProfileFor(intent)` zwraca klasę profilu albo `undefined`. `undefined`
oraz `onUnknownCase` → profil `out_of_scope` (brak shop-tooli). **Nie** ma
`general_agent` ze wszystkimi toolami.

Wspólne `forbiddenActions` (checkout, payment, place_order, account_login)
zostają na każdym profilu sklepowym.

## Mapowanie tooli (to repo)

Id w `tools` = id `createTool` z `createEvaMastraAgent`, execute → Nest.

| `ShopIntent` | Tool-e tury | Rola |
| --- | --- | --- |
| `product_info` | `resolve-template`, `lookup-leaf` | Dopasowanie auta (kaskada) + fakty produktu z liścia |
| `pricing` | `resolve-template`, `quote-price` | Szablon, potem jedna kwota z macierzy |
| `delivery` | `lookup-leaf` | Liście dostawy / terminów (slug z drzewa) |
| `after_sales` | `lookup-leaf` | Pielęgnacja, gwarancja, montaż; miss → ścieżka leada Nest |
| `out_of_scope` | `[]` | Brak fetcha sklepu; ewentualnie zbieranie kontaktu (lead = Nest) |

`resolve-template` zastępuje szkic `lookup_mat_template`. Wynik kaskady:
`none` / `one` / `many`. Przy `many` agent dopytuje i woła tool ponownie; nie
wybiera „nowszej generacji”. `one` to tożsamość szablonu, nie stan magazynu.
VIN poza zakresem.

`quote-price` tylko na gałęzi `pricing`. Kwota nigdy z profilu `product_info`.

## Maszyna stanów

Sesja trzyma **bieżący** `ShopIntent` (po pierwszej zaakceptowanej
kwalifikacji).

| Sytuacja | Reguła |
| --- | --- |
| Brak stanu (pierwsza tura) | Kandydat z kwalifikatora, jeśli jest profil; inaczej `out_of_scope` |
| `allowIntentSwitch: true` | Nowy stan tylko gdy `kandydat ∈ allowedTransitions` **lub** `kandydat === bieżący` |
| Niedozwolone przejście | Zostaje bieżący profil (agent nie skacze poza graf) |
| `allowIntentSwitch: false` | Ignoruj kandydata; zostań w bieżącym stanie |
| Brak pola `routing` | Brak krawędzi — nie wychodzi ze stanu, dopóki profil tego nie zdefiniuje |

Kwalifikator: structured output `ShopIntent` + `confidence`. Próg
`LOW_INTENT_CONFIDENCE` (0.5): jedno `reclassify`, potem `out_of_scope` z
pustą mapą tooli. Brak profilu, `general_agent` i wyjątek qualify →
`out_of_scope`. Lead nie jest tool-em.

Gałąź składa agenta tury: instructions bazowe EVA + `profile.instructions` +
`profile.context`; `tools` przecięte z rejestrem Mastry (nieznane id = błąd
testu, nie cichy drop). HTTP SSE bez zmiany.

Sesja HTTP trzyma bieżący `ShopIntent` w `IntentSessionState` (Map w
procesie). `prepareIntentTurn(..., { currentIntent })` po fallbacku woła
`acceptIntentTransition`. Wymuszony `out_of_scope` (niska pewność / błąd
qualify) omija filtr krawędzi. Stan nie jest w Supabase — restart API go
zeruje.

## Poza tym projektem

Nie kopiować statusów `ambiguous` / `candidates` / `generationHint` z innego
szkicu, dopóki kaskada Nest ich nie ma.
