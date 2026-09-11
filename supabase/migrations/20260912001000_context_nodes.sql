-- Slice 3: context tree leaves for store facts (no RAG).
-- Do not apply to PROD without an explicit go-ahead.
-- Legal copy for chat-zapis / zgoda-lead is pasted by the business, not generated.

create schema if not exists eva_bot;

create table if not exists eva_bot.context_nodes (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references eva_bot.context_nodes (id),
  slug text not null,
  title text not null,
  body text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true
);

create unique index if not exists context_nodes_slug_uidx
  on eva_bot.context_nodes (slug);

comment on table eva_bot.context_nodes is
  'FAQ / policy tree. Nest returns leaf body by slug; LLM does not invent facts.';

insert into eva_bot.context_nodes (slug, title, body, sort_order, is_active)
values
  ('chat-zapis', 'Zapis rozmowy', '', 0, true),
  ('zgoda-lead', 'Zgoda na kontakt', '', 1, true);
