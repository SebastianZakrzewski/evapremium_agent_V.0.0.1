-- FAQ leaf: trwałość dywaników (produkt). Upsert by slug.
-- Do not apply to PROD without an explicit go-ahead.

insert into eva_bot.context_nodes (slug, title, body, sort_order, is_active, retrieval_text)
values
  (
    'trwalosc-dywanikow',
    'Trwałość dywaników',
    'Dywaniki są bardzo trwałe. Wykonujemy je z materiału stosowanego m.in. w podeszwach butów sportowych oraz matach na siłowniach. Przy normalnym, codziennym użytkowaniu mogą spokojnie służyć przez około 7–8 lat.',
    24,
    true,
    'trwałość dywaników jak długo wytrzymują dywaniki ile lat służą dywaniki żywotność dywaników czy dywaniki są trwałe czy szybko się niszczą odporność materiału wytrzymałość dywaników'
  )
on conflict (slug) do update
set
  title = excluded.title,
  body = excluded.body,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  retrieval_text = excluded.retrieval_text
