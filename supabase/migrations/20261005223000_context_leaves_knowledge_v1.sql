-- Knowledge V.1 leaves. Applied on PROD 2026-10-05.
-- Source: docs/product-specs/knowledge_versioning/new_knowledge_to_update_V.1.json

insert into eva_bot.context_nodes (slug, title, body, sort_order, is_active, retrieval_text, parent_id)
select
  incoming.slug,
  incoming.title,
  incoming.body,
  incoming.sort_order,
  true,
  incoming.retrieval_text,
  parent.id
from (
  values
    (
      'otwory-mocowania',
      'Otwory pod oryginalne mocowania',
      'Tak. Dywaniki powstają indywidualnie według naszych autorskich szablonów. Szablon dla danej marki, modelu i wersji przygotowaliśmy na podstawie wcześniejszych pomiarów naszych specjalistów. W komplecie są otwory pod oryginalne mocowania z podłogi — takie, jakie są w aucie.',
      42,
      'czy dywaniki mają otwory na oryginalne mocowania klipsy zaczepy miejsca mocowania jak w aucie fabryczne',
      'dopasowanie'
    ),
    (
      'przyczepnosc-eva',
      'Przyczepność pianki EVA',
      'Nie. Pianka EVA nie jest śliska. Chropowata powierzchnia daje pewne oparcie stopie, także zimą, gdy temperatura spada i w aucie jest wilgotno. Dzięki temu dywaniki pozostają wygodne w użytkowaniu.',
      25,
      'czy pianka EVA jest śliska przyczepność chropowata powierzchnia zima wilgoć nie ślizga się antypoślizg',
      'material'
    ),
    (
      'mycie-karcher',
      'Mycie myjką ciśnieniową',
      'Tak. Dywaniki można myć myjką ciśnieniową, na przykład Karcherem. Pianka EVA jest odporna na chemię i środki czyszczące.',
      52,
      'czy można myć karcherem myjka ciśnieniowa chemia środki czyszczące odporny na detergenty',
      'pielegnacja'
    ),
    (
      'zwrot-dywanikow',
      'Zwrot dywaników',
      'Nie w ramach zwykłego zwrotu. Dywaniki z pianki EVA powstają na zamówienie, więc nie obejmuje ich standardowa polityka zwrotów. Nie przyjmujemy zwrotów z powodów estetycznych. Każdy klient ma gwarancję dopasowania do swojego pojazdu. Jeśli komplet albo którykolwiek dywanik nie pasuje, można zgłosić reklamację — wtedy na nasz koszt poprawiamy produkt i odsyłamy go do klienta.',
      83,
      'czy mogę zwrócić dywaniki zwrot zamówienie na wymiar powody estetyczne gwarancja dopasowania reklamacja',
      'reklamacja'
    )
) as incoming(slug, title, body, sort_order, retrieval_text, parent_slug)
join eva_bot.context_nodes as parent on parent.slug = incoming.parent_slug
on conflict (slug) do update
set
  title = excluded.title,
  body = excluded.body,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  retrieval_text = excluded.retrieval_text,
  parent_id = excluded.parent_id;
