create extension if not exists pgcrypto;

create table if not exists public.dapa_law_catalog (
  id uuid primary key default gen_random_uuid(),
  source_type text not null default 'defense_law',
  section text not null,
  law_type text not null,
  title text not null,
  query text not null,
  target text not null default 'law',
  law_go_kr_url text,
  source_url text not null,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dapa_law_catalog_target_check check (target in ('law', 'admrul', 'ordin')),
  constraint dapa_law_catalog_unique unique (source_type, title, law_type, section)
);

create table if not exists public.dapa_admin_rule_catalog (
  id uuid primary key default gen_random_uuid(),
  source_type text not null default 'admin_rule',
  title text not null,
  query text not null,
  target text not null default 'admrul',
  category text,
  issue_number text,
  row_number text,
  latest_modified_date date,
  page integer,
  page_row integer,
  group_seq text,
  file_id text,
  source_url text not null,
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dapa_admin_rule_catalog_target_check check (target in ('law', 'admrul', 'ordin')),
  constraint dapa_admin_rule_catalog_unique unique (source_type, title)
);

create table if not exists public.catalog_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  items_found integer not null default 0,
  items_upserted integer not null default 0,
  error_message text
);

create index if not exists dapa_law_catalog_search_idx
  on public.dapa_law_catalog using gin (to_tsvector('simple', title || ' ' || query));

create index if not exists dapa_admin_rule_catalog_search_idx
  on public.dapa_admin_rule_catalog using gin (to_tsvector('simple', title || ' ' || query));

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_dapa_law_catalog_updated_at on public.dapa_law_catalog;
create trigger set_dapa_law_catalog_updated_at
before update on public.dapa_law_catalog
for each row execute function public.set_updated_at();

drop trigger if exists set_dapa_admin_rule_catalog_updated_at on public.dapa_admin_rule_catalog;
create trigger set_dapa_admin_rule_catalog_updated_at
before update on public.dapa_admin_rule_catalog
for each row execute function public.set_updated_at();
