# Widget — szkielet UI

Kod: `widget/src/App.test.tsx`  
Standard: [docs/test-cases/README.md](../README.md)

Logika zestawu: pakiet `widget` się buduje i renderuje placeholder. Brak
ścieżki wyceny i miss (Slice 6).

| id | Krytyczność | Tytuł |
| --- | --- | --- |
| widget-001 | low | Placeholder szkieletu |

### widget-001 — Placeholder szkieletu

- **Kod:** `widget/src/App.test.tsx` → `it('renders the skeleton placeholder')`
- **Krytyczność:** low
- **Logika:** smoke pakietu Vite/React; nie strzeże ceny, kaskady ani zgody na lead.
- **Wejście:** render `<App />` bez propsów
- **Wyjście:** w dokumencie tekst `EVA Premium — widget czatu (szkielet)`
