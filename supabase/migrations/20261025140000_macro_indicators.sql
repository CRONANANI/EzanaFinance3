-- Country macro indicators for Sonar country rankings
-- (sonar-country-ranking-fix, B2). World Bank WDI (CC BY 4.0), refreshed
-- weekly by /api/cron/macro-worldbank. Rankings are precomputed into
-- dataset_snapshots key 'macro:rankings' (20261024200000_dataset_snapshots).
--
-- NOT executed by the implementer. Noah applies it by hand in the SQL Editor.
-- Additive and idempotent; safe to run more than once.

create table if not exists public.macro_countries (
  iso3 text primary key,
  iso2 text unique,
  name text not null,
  region text,
  income_group text,
  is_aggregate boolean not null default false,   -- World Bank regions / income groups
  is_territory boolean not null default false     -- e.g. Northern Mariana Islands, Puerto Rico
);

create table if not exists public.macro_indicators (
  iso3 text references public.macro_countries (iso3),
  indicator text not null,
  year int not null,
  value numeric,
  source text not null,
  measure_type text not null default 'observed'
    check (measure_type in ('observed', 'estimated', 'forecast')),
  fetched_at timestamptz not null default now(),
  primary key (iso3, indicator, year, source)
);

alter table public.macro_countries enable row level security;
alter table public.macro_indicators enable row level security;
do $$ begin
  create policy "public read" on public.macro_countries for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public read" on public.macro_indicators for select using (true);
exception when duplicate_object then null; end $$;
revoke insert, update, delete on public.macro_countries, public.macro_indicators
  from anon, authenticated;

create index if not exists macro_ind_year_idx on public.macro_indicators (indicator, year);
