alter table public.dapa_law_catalog
  add column if not exists api_match_status text not null default 'unchecked',
  add column if not exists api_match_checked_at timestamptz,
  add column if not exists api_target text,
  add column if not exists api_id text,
  add column if not exists api_mst text,
  add column if not exists api_title text,
  add column if not exists api_effective_date text,
  add column if not exists api_match_error text;

alter table public.dapa_admin_rule_catalog
  add column if not exists api_match_status text not null default 'unchecked',
  add column if not exists api_match_checked_at timestamptz,
  add column if not exists api_target text,
  add column if not exists api_id text,
  add column if not exists api_mst text,
  add column if not exists api_title text,
  add column if not exists api_effective_date text,
  add column if not exists api_match_error text,
  add column if not exists homepage_file_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'dapa_law_catalog_api_match_status_check'
  ) then
    alter table public.dapa_law_catalog
      add constraint dapa_law_catalog_api_match_status_check
      check (api_match_status in (
        'unchecked',
        'matched',
        'partial_match',
        'api_missing',
        'homepage_only',
        'rag_only',
        'error'
      ));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'dapa_admin_rule_catalog_api_match_status_check'
  ) then
    alter table public.dapa_admin_rule_catalog
      add constraint dapa_admin_rule_catalog_api_match_status_check
      check (api_match_status in (
        'unchecked',
        'matched',
        'partial_match',
        'api_missing',
        'homepage_only',
        'rag_only',
        'error'
      ));
  end if;
end $$;

create table if not exists public.dapa_api_coverage_checks (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_key text not null,
  source_title text not null,
  source_category text,
  source_section text,
  source_date text,
  api_target text not null,
  api_match_status text not null,
  api_id text,
  api_mst text,
  api_title text,
  api_effective_date text,
  api_match_error text,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint dapa_api_coverage_checks_status_check
    check (api_match_status in (
      'matched',
      'partial_match',
      'api_missing',
      'homepage_only',
      'rag_only',
      'error'
    )),
  constraint dapa_api_coverage_checks_unique unique (source_table, source_key, api_target)
);

create table if not exists public.dapa_rag_documents (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_key text not null,
  title text not null,
  category text,
  section text,
  source_url text not null,
  file_url text,
  content_text text,
  search_text text generated always as (
    coalesce(title, '') || ' ' ||
    coalesce(category, '') || ' ' ||
    coalesce(section, '') || ' ' ||
    coalesce(content_text, '')
  ) stored,
  metadata jsonb not null default '{}'::jsonb,
  indexed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dapa_rag_documents_unique unique (source_type, source_key)
);

create index if not exists dapa_api_coverage_checks_status_idx
  on public.dapa_api_coverage_checks (api_match_status, api_target);

create index if not exists dapa_rag_documents_search_idx
  on public.dapa_rag_documents using gin (to_tsvector('simple', search_text));

drop trigger if exists set_dapa_rag_documents_updated_at on public.dapa_rag_documents;
create trigger set_dapa_rag_documents_updated_at
before update on public.dapa_rag_documents
for each row execute function public.set_updated_at();
