create extension if not exists "pgcrypto";

create table series (
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

create table volumes (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references series(id) on delete cascade,
  number integer not null check (number > 0),
  price numeric(6,2) not null check (price >= 0),
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (series_id, number)
);

create index volumes_series_id_idx on volumes(series_id);
