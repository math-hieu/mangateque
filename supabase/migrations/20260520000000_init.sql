create extension if not exists "pgcrypto";

create schema if not exists mangateque;

create table mangateque.series (
  id uuid primary key default gen_random_uuid(),
  anilist_id integer,
  title text not null,
  cover_url text,
  publisher text not null,
  edition_variant text,
  total_volumes integer,
  status text not null check (status in ('ongoing', 'completed')),
  created_at timestamptz not null default now()
);

create table mangateque.volumes (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references mangateque.series(id) on delete cascade,
  number integer not null check (number > 0),
  price numeric(6,2) not null check (price >= 0),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (series_id, number)
);

create index volumes_series_id_idx on mangateque.volumes(series_id);

-- Grant access to PostgREST roles (required for the Data API to see custom schemas).
grant usage on schema mangateque to anon, authenticated, service_role;
grant all on all tables in schema mangateque to anon, authenticated, service_role;
grant all on all sequences in schema mangateque to anon, authenticated, service_role;
alter default privileges in schema mangateque
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema mangateque
  grant all on sequences to anon, authenticated, service_role;
