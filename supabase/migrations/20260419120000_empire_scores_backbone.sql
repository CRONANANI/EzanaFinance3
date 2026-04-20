-- =============================================================================
-- Empire Rankings data backbone — schema
-- -----------------------------------------------------------------------------
-- Adds the pluggable multi-source scoring tables used by the "Data & Charts
-- for Empire Rankings" page to score 60 countries across 18 Dalio-style
-- dimensions.
--
-- Design:
--   • empire_countries      — catalog of countries (extended in place)
--   • empire_dimensions     — the 18 canonical dimensions shown on the UI
--   • country_scores_raw    — one row per (country, dimension, metric, year,
--                             source); stores every raw observation
--   • dimension_metric_map  — which metrics feed which dimensions, with
--                             per-metric weight + invert flag
--
-- A companion migration (20260419120100) seeds the 60 countries, 18 dims,
-- and the first batch of World-Bank metric mappings. A third migration
-- (20260419120200) builds the min-max normalized view that turns raw
-- values into 0-100 dimension scores.
--
-- NOTE: an earlier migration (20260405_empire_ranking_schema.sql) already
-- created `empire_countries` with (code TEXT PK, name, flag, region,
-- population, is_eurozone). That table stays; we extend it with the
-- additional columns the new backbone needs.
-- =============================================================================

create extension if not exists "pgcrypto";

-- ─── 1. Extend empire_countries ───────────────────────────────────────────────
alter table public.empire_countries
  add column if not exists iso2 char(2),
  add column if not exists economic_rank int,
  add column if not exists included boolean not null default true;

-- The `code` column is already a 3-letter ISO-alpha-3 string for every real
-- country (USA, CHN, ...), so we treat `code` as the iso3 identifier for
-- foreign keys from the new raw-scores table. No PK migration needed.
comment on column public.empire_countries.code is
  'ISO 3166-1 alpha-3 code (primary key). Used as the iso3 identifier by the scoring backbone.';

create index if not exists empire_countries_economic_rank_idx
  on public.empire_countries (economic_rank) where included = true;

-- ─── 2. empire_dimensions ─────────────────────────────────────────────────────
create table if not exists public.empire_dimensions (
  id text primary key,                    -- slug: 'debt_burden', 'expected_growth', etc.
  name text not null,                     -- display name matching UI label exactly
  description text,
  higher_is_better boolean not null,      -- Debt Burden: lower is better → false
  category text,                          -- 'Economic' | 'Social' | 'Power Projection' | 'Fundamentals'
  display_order int                       -- 1..18 matching card order
);

comment on table public.empire_dimensions is
  'Canonical 18 Dalio-style power dimensions shown on the Empire Rankings page.';

-- ─── 3. country_scores_raw ────────────────────────────────────────────────────
create table if not exists public.country_scores_raw (
  id uuid primary key default gen_random_uuid(),
  country_iso3 char(3) not null,
  dimension_id text not null references public.empire_dimensions(id),
  metric_id text not null,                -- e.g. 'gdp_current_usd', 'adult_literacy_rate'
  year int not null,
  raw_value numeric,
  unit text,                              -- 'USD' | 'percent' | 'index_0_100' | ...
  source text not null,                   -- 'world_bank' | 'imf' | 'sipri' | 'placeholder' ...
  source_series_id text,                  -- e.g. WB indicator code 'NY.GDP.MKTP.CD'
  fetched_at timestamptz not null default now(),
  constraint country_scores_raw_unique
    unique (country_iso3, dimension_id, metric_id, year, source)
);

-- FK to empire_countries(code). We reference by name rather than adding an
-- inline REFERENCES clause because we want this table to still accept rows
-- for the full iso3 set in case the catalog is mid-seed.
alter table public.country_scores_raw
  drop constraint if exists country_scores_raw_country_fk;
alter table public.country_scores_raw
  add constraint country_scores_raw_country_fk
  foreign key (country_iso3) references public.empire_countries(code)
  on delete cascade;

create index if not exists country_scores_raw_lookup_idx
  on public.country_scores_raw (dimension_id, year, country_iso3);

create index if not exists country_scores_raw_source_idx
  on public.country_scores_raw (source, fetched_at desc);

comment on table public.country_scores_raw is
  'Raw observations from every upstream data source. One row per (country, dimension, metric, year, source). Composite 0-100 scores are derived in public.country_dimension_scores view.';

-- ─── 4. dimension_metric_map ──────────────────────────────────────────────────
create table if not exists public.dimension_metric_map (
  dimension_id text not null references public.empire_dimensions(id),
  metric_id text not null,
  source text not null,
  weight numeric not null default 1.0,
  invert boolean not null default false,  -- true if higher raw = worse for this dimension
  primary key (dimension_id, metric_id, source)
);

comment on table public.dimension_metric_map is
  'Registry mapping each dimension to the metrics that feed it. Drives what the sync job pulls and how the normalized view composes dimension scores.';

-- ─── 5. RLS — public read, service-role write ────────────────────────────────
alter table public.empire_dimensions enable row level security;
alter table public.country_scores_raw enable row level security;
alter table public.dimension_metric_map enable row level security;

drop policy if exists "empire_dimensions_public_read" on public.empire_dimensions;
create policy "empire_dimensions_public_read"
  on public.empire_dimensions for select using (true);

drop policy if exists "country_scores_raw_public_read" on public.country_scores_raw;
create policy "country_scores_raw_public_read"
  on public.country_scores_raw for select using (true);

drop policy if exists "dimension_metric_map_public_read" on public.dimension_metric_map;
create policy "dimension_metric_map_public_read"
  on public.dimension_metric_map for select using (true);

notify pgrst, 'reload schema';
