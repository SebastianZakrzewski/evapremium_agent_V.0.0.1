-- Open contact collection for one chat session.
-- Do not apply to PROD without an explicit go-ahead.
-- Message text does not belong in this column. The contact itself stays in session_clients.

alter table eva_bot.session_agent_state
  add column if not exists contact_workflow jsonb;
