-- Slice 2: append-only agent domain events for the operator dashboard.
-- Do not apply to PROD without an explicit go-ahead.

create schema if not exists eva_bot;

create table if not exists eva_bot.agent_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  occurred_at timestamptz not null default now(),
  type text not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists agent_events_session_id_idx
  on eva_bot.agent_events (session_id);

create index if not exists agent_events_occurred_at_idx
  on eva_bot.agent_events (occurred_at);

comment on table eva_bot.agent_events is
  'Append-only Nest domain events for dashboard KPI. Payload is facts, not chat text.';
