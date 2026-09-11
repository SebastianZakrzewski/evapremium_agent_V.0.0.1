-- Slice 5: chat transcript. Do not apply to PROD without an explicit go-ahead.
-- Full transcript stays here; Bitrix Lead gets contact + vehicle note + session id only.

create schema if not exists eva_bot;

create table if not exists eva_bot.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists eva_bot.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references eva_bot.chat_sessions (id),
  role text not null check (role in ('user', 'assistant')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_created_idx
  on eva_bot.chat_messages (session_id, created_at);

comment on table eva_bot.chat_sessions is
  'Chat debug/context. Nest writes; widget does not use anon Supabase.';
comment on table eva_bot.chat_messages is
  'Full transcript. Not copied into Bitrix Lead.';
