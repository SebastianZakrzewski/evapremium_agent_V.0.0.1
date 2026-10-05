-- FAQ leaf: dywaniki produkowane indywidualnie pod auto.
-- Upsert by slug. Do not apply to PROD without an explicit go-ahead.
-- After apply, re-ingest embeddings: search uses retrieval_text.

insert into eva_bot.context_nodes (slug, title, body, sort_order, is_active, retrieval_text)
values
  (
    'produkcja-indywidualna',
    'Produkcja pod auto',
    'Tak. Każdy komplet dywaników EvaPremium powstaje indywidualnie pod konkretne auto — według szablonu dopasowanego do marki, modelu i wersji, a nie jako uniwersalna mata. Jeśli podasz markę, model i rok, sprawdzimy, czy mamy gotowy szablon.',
    41,
    true,
    'czy dywaniki produkowane indywidualnie pod auto szyte na miarę na wymiar pod konkretny samochód każdy komplet osobno nie uniwersalne'
  )
on conflict (slug) do update
set
  title = excluded.title,
  body = excluded.body,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  retrieval_text = excluded.retrieval_text;
