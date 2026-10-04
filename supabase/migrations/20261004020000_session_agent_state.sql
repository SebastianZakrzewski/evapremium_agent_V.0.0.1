-- Agent turn state for one chat session. Do not apply to PROD without an explicit go-ahead.
-- Message text does not belong in this table.

create table if not exists eva_bot.session_agent_state (
  session_id text primary key,
  intent jsonb,
  quote_workflow jsonb,
  fitment jsonb,
  updated_at timestamptz not null default now()
);

comment on table eva_bot.session_agent_state is
  'Intent and open fitment or quote workflow for one chat. Nest reloads it after a process restart.';
