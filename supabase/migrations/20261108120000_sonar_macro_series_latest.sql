-- Sonar macro wiring (Nov 2026): macro_series_latest, one row per series with its latest
-- observed value and the value one year earlier. Sonar reads this instead of scanning the
-- 1.6 million rows in macro_series_values. Same SQL as sonar-macro-wiring-migration.md,
-- wrapped so the stub-schema harness (no macro_series_values) skips it.
--
--   * Forecast years (IMF projections) are left out: "latest" always means observed.
--   * /api/cron/macro-sync calls refresh_macro_series_latest() after a run that wrote rows.
--   * Server only (service role), like the table it summarises.
--
-- Idempotent.

do $$
begin
  if to_regclass('public.macro_series_values') is null then
    raise notice 'macro_series_values is missing; macro_series_latest not created';
    return;
  end if;

  execute $v$
    create materialized view if not exists public.macro_series_latest as
    with obs as (
      select source, series_key, country_iso3, period, value, series_name, unit, frequency,
             dataset, fetched_at
      from public.macro_series_values
      where value is not null
        and period ~ '^\d{4}'
        and left(period, 4)::int <= extract(year from now())::int   -- no forecast years
    ),
    latest as (
      select distinct on (source, series_key) *
      from obs
      order by source, series_key, period desc
    )
    select
      l.source,
      l.series_key,
      l.country_iso3,
      l.period,
      l.value,
      l.series_name,
      l.unit,
      l.frequency,
      l.dataset,
      l.fetched_at,
      p.period as year_ago_period,
      p.value  as year_ago_value
    from latest l
    left join public.macro_series_values p
      on p.source = l.source
     and p.series_key = l.series_key
     and p.period = ((left(l.period, 4)::int - 1)::text || substr(l.period, 5))
  $v$;

  -- Required for a non-blocking (concurrent) refresh.
  execute 'create unique index if not exists macro_series_latest_pk
             on public.macro_series_latest (source, series_key)';
  execute 'create index if not exists macro_series_latest_country_idx
             on public.macro_series_latest (country_iso3, source)';
  execute 'create index if not exists macro_series_latest_source_dataset_idx
             on public.macro_series_latest (source, dataset)';

  -- Server-only, like macro_series_values.
  execute 'revoke all on public.macro_series_latest from anon, authenticated';
  execute 'grant select on public.macro_series_latest to service_role';
end;
$$;

-- Called by /api/cron/macro-sync after a run that wrote rows.
create or replace function public.refresh_macro_series_latest()
returns void
language plpgsql
security definer
set search_path = public
set statement_timeout = '180s'
as $$
begin
  refresh materialized view concurrently public.macro_series_latest;
end;
$$;

revoke all on function public.refresh_macro_series_latest() from public, anon, authenticated;
grant execute on function public.refresh_macro_series_latest() to service_role;
