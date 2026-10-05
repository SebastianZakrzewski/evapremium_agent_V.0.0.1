-- Branch nodes for the live relatedBranches slugs, plus the other FAQ groups.
-- Three leaf slugs matched those branch names, so the leaves move:
-- kolory → kolorystyka, dostawa → wysylka, reklamacja → procedura-reklamacji.
-- Branch body stays empty (lookup-leaf miss). Search uses retrieval_text.
-- After apply, embed the branch slugs. Do not apply to PROD without an explicit go-ahead.

update eva_bot.context_nodes
set slug = 'kolorystyka'
where slug = 'kolory';

update eva_bot.context_node_embeddings
set slug = 'kolorystyka'
where slug = 'kolory';

update eva_bot.context_nodes
set slug = 'wysylka'
where slug = 'dostawa';

update eva_bot.context_node_embeddings
set slug = 'wysylka'
where slug = 'dostawa';

update eva_bot.context_nodes
set slug = 'procedura-reklamacji'
where slug = 'reklamacja';

update eva_bot.context_node_embeddings
set slug = 'procedura-reklamacji'
where slug = 'reklamacja';

insert into eva_bot.context_nodes (slug, title, body, sort_order, is_active, retrieval_text)
values
  (
    'material',
    'Materiał',
    '',
    19,
    true,
    'materiał pianka EVA skład właściwości parametry struktura trwałość z czego wykonane'
  ),
  (
    'warianty',
    'Warianty',
    '',
    29,
    true,
    'wariant dywaników 3D ranty bez rantów obwódka krawędź profil'
  ),
  (
    'kolory',
    'Kolory',
    '',
    33,
    true,
    'kolory paleta barwy odcienie wybór koloru warianty kolorystyczne'
  ),
  (
    'dopasowanie',
    'Dopasowanie',
    '',
    39,
    true,
    'dopasowanie do auta marka model szablon produkcja indywidualna pod samochód'
  ),
  (
    'pielegnacja',
    'Pielęgnacja',
    '',
    49,
    true,
    'czyszczenie pielęgnacja mycie użytkowanie zima lato sezon'
  ),
  (
    'akcesoria',
    'Akcesoria',
    '',
    59,
    true,
    'montaż podpiętki mocowanie zakładanie akcesoria'
  ),
  (
    'dostawa',
    'Dostawa',
    '',
    69,
    true,
    'dostawa wysyłka kurier czas realizacji produkcja termin kiedy dotrze'
  ),
  (
    'reklamacja',
    'Reklamacja',
    '',
    79,
    true,
    'reklamacja gwarancja niedopasowanie wymiana wada zgłoszenie'
  )
on conflict (slug) do update
set
  title = excluded.title,
  body = excluded.body,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  retrieval_text = excluded.retrieval_text;

update eva_bot.context_nodes as child
set parent_id = parent.id
from eva_bot.context_nodes as parent
where parent.slug = 'material'
  and child.slug in (
    'material-eva',
    'parametry',
    'wlasciwosci',
    'struktura-komorek',
    'trwalosc-dywanikow'
  );

update eva_bot.context_nodes as child
set parent_id = parent.id
from eva_bot.context_nodes as parent
where parent.slug = 'warianty'
  and child.slug in ('3d-z-rantami', '3d-bez-rantow');

update eva_bot.context_nodes as child
set parent_id = parent.id
from eva_bot.context_nodes as parent
where parent.slug = 'kolory'
  and child.slug = 'kolorystyka';

update eva_bot.context_nodes as child
set parent_id = parent.id
from eva_bot.context_nodes as parent
where parent.slug = 'dopasowanie'
  and child.slug in ('dopasowanie-model', 'produkcja-indywidualna');

update eva_bot.context_nodes as child
set parent_id = parent.id
from eva_bot.context_nodes as parent
where parent.slug = 'pielegnacja'
  and child.slug in ('czyszczenie', 'uzytkowanie-zima-lato');

update eva_bot.context_nodes as child
set parent_id = parent.id
from eva_bot.context_nodes as parent
where parent.slug = 'akcesoria'
  and child.slug in ('montaz', 'podpietki');

update eva_bot.context_nodes as child
set parent_id = parent.id
from eva_bot.context_nodes as parent
where parent.slug = 'dostawa'
  and child.slug in ('czas-produkcji', 'wysylka');

update eva_bot.context_nodes as child
set parent_id = parent.id
from eva_bot.context_nodes as parent
where parent.slug = 'reklamacja'
  and child.slug in ('gwarancja', 'niedopasowanie-wymiana', 'procedura-reklamacji');
