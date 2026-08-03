-- OECD series rollups. BigQuery (ezana-data.oecd.observations) is source of
-- truth; sync-oecd-rollups copies curated series here. Public read, service-
-- role writes. Additive.

create table if not exists public.oecd_series_observations (
  ezana_slug text not null, ref_area text not null, ref_area_name text,
  year int not null, obs_value numeric, obs_status text, unit_label text,
  synced_at timestamptz not null default now(),
  primary key (ezana_slug, ref_area, year)
);
create index if not exists idx_oso_slug_year on public.oecd_series_observations (ezana_slug, year desc);
create index if not exists idx_oso_area on public.oecd_series_observations (ezana_slug, ref_area);

create table if not exists public.oecd_series_coverage (
  ezana_slug text primary key, measure_name text, unit_name text,
  country_count int not null default 0, year_min int, year_max int,
  obs_count bigint not null default 0,
  synced_at timestamptz not null default now()
);

-- Latest + prior-year value per (slug, country), capped at a horizon year so
-- the page can exclude far projections if desired. SECURITY DEFINER-free:
-- reads public tables only, safe under invoker rights.
create or replace function public.oecd_latest_observations(
  p_slugs text[],
  p_max_year int default null
)
returns table (
  ezana_slug text, ref_area text, ref_area_name text,
  latest_year int, latest_value numeric,
  prior_year int, prior_value numeric, unit_label text
)
language sql stable as $$
  with ranked as (
    select o.*, row_number() over (
      partition by o.ezana_slug, o.ref_area order by o.year desc
    ) rn
    from public.oecd_series_observations o
    where o.ezana_slug = any(p_slugs)
      and (p_max_year is null or o.year <= p_max_year)
  )
  select l.ezana_slug, l.ref_area, l.ref_area_name,
         l.year, l.obs_value, p.year, p.obs_value, l.unit_label
  from ranked l
  left join ranked p
    on p.ezana_slug = l.ezana_slug and p.ref_area = l.ref_area and p.rn = 2
  where l.rn = 1;
$$;

do $$
declare t text;
begin
  foreach t in array array['oecd_series_observations','oecd_series_coverage'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read %1$s" on public.%1$I', t);
    execute format('create policy "public read %1$s" on public.%1$I for select using (true)', t);
    execute format('revoke insert, update, delete on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
  grant execute on function public.oecd_latest_observations(text[], int) to anon, authenticated;
end $$;
