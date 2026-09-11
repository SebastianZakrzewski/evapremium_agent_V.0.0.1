-- Slice 1: vehicle slot aliases for template cascade.
-- Do not apply to PROD without an explicit go-ahead.

create table if not exists eva_bot.vehicle_slot_aliases (
  id uuid primary key default gen_random_uuid(),
  slot_kind text not null check (slot_kind in ('brand', 'model', 'body_type')),
  alias_normalized text not null,
  canonical_key text not null,
  brand_key text,
  created_at timestamptz not null default now()
);

create unique index if not exists vehicle_slot_aliases_kind_alias_brand_uidx
  on eva_bot.vehicle_slot_aliases (
    slot_kind,
    alias_normalized,
    coalesce(brand_key, '')
  );

comment on table eva_bot.vehicle_slot_aliases is
  'Maps normalized client slots to mat_templates canonical keys. Nest reads; LLM does not pick template ids.';
