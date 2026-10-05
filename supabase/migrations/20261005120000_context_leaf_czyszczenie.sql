-- FAQ leaf: czyszczenie. Instrukcja pielęgnacji jak na evapremium.pl.
-- Upsert by slug. Body only; retrieval_text stays the cleaning-question index.
-- Do not apply to PROD without an explicit go-ahead.

insert into eva_bot.context_nodes (slug, title, body, sort_order, is_active, retrieval_text)
values
  (
    'czyszczenie',
    'Jak czyścić',
    'Dywaniki EVA są niezwykle łatwe w czyszczeniu. Wystarczy opłukać je wodą lub przetrzeć wilgotną szmatką. W przypadku większych zabrudzeń możesz użyć delikatnego detergentu. Materiał EVA jest wodoodporny i szybko schnie.',
    50,
    true,
    'czyścić prać myć pielęgnacja odkurzanie myjka detergent pralka jak dbać'
  )
on conflict (slug) do update
set
  title = excluded.title,
  body = excluded.body,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
