-- Turn budget counters. Do not apply to PROD without an explicit go-ahead.
-- Guest rows store a hash, never the raw IP address.

alter table eva_bot.chat_sessions
  add column if not exists user_turns integer not null default 0;

alter table eva_bot.chat_sessions
  drop constraint if exists chat_sessions_user_turns_nonnegative;

alter table eva_bot.chat_sessions
  add constraint chat_sessions_user_turns_nonnegative check (user_turns >= 0);

create table if not exists eva_bot.usage_buckets (
  bucket_key text primary key,
  subject_kind text not null check (subject_kind in ('ip_turn', 'ip_session')),
  subject_hash text not null,
  window_start timestamptz not null,
  count integer not null check (count >= 0),
  unique (subject_kind, subject_hash, window_start)
);

comment on table eva_bot.usage_buckets is
  'Hourly guest chat budget. subject_hash is SHA-256 of the IP and server salt.';
