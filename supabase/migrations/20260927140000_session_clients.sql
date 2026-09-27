-- Profil klienta jednej sesji czatu (osoba, auto, ustalenie wyceny).
-- Do not apply to PROD without an explicit go-ahead.

create schema if not exists eva_bot;

create table if not exists eva_bot.session_clients (
  session_id text primary key,
  given_name text,
  family_name text,
  phone text,
  email text,
  contact_consent boolean not null default false,
  consent_at timestamptz,
  car_brand text,
  car_model text,
  year integer,
  body_type text,
  missing_slot text,
  cascade_status text,
  brand_key text,
  model_key text,
  body_type_key text,
  template_record_key text,
  quote_variant text,
  mat_type text,
  updated_at timestamptz not null default now()
);

comment on table eva_bot.session_clients is
  'Facts the client stated in one chat session. Nest writes them. The turn reads a slice only when the answer needs it.';
