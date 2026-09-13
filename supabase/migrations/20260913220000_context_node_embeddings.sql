-- Slice 3: pgvector index of context tree leaves (slug search, not FAQ body).
-- Do not apply to PROD without an explicit go-ahead.

create schema if not exists eva_bot;

create extension if not exists vector;

create table if not exists eva_bot.context_node_embeddings (
  slug text primary key,
  chunk text not null,
  embedding vector(1536) not null,
  updated_at timestamptz not null default now()
);

comment on table eva_bot.context_node_embeddings is
  'Helper index for Nest slug search. Source of truth remains eva_bot.context_nodes.';
