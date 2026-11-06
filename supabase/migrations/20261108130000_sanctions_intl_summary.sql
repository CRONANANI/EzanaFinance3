-- Sonar international sanctions (Nov 2026): two read-only summaries over
-- sanctions_intl_entries (EU Financial Sanctions Files, UK Sanctions List (FCDO),
-- UN Security Council Consolidated List), active rows only.
--
--   sanctions_intl_country_summary(iso3)  per list: listings naming the country, by type,
--       the top regimes, and recent additions (designated in the last 90 days, or first
--       seen after the list's first sync; the first sync stamped every row with one date)
--   sanctions_intl_country_counts(list)   listings by country for one list, or all three
--       when the list is null, most first (top 50)
--
-- Server only (service role). Additive and idempotent. Without them Sonar falls back to
-- exact per-list counts with no regimes.

-- Bodies are checked when called, not when created (the stub-schema harness has no table).
set check_function_bodies = off;

create or replace function public.sanctions_intl_country_summary(p_iso3 text)
returns table (
  list_source text,
  listings bigint,
  entities bigint,
  individuals bigint,
  recent bigint,
  top_regimes jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  with first_sync as (
    select s.list_source, min(s.first_seen) as first_seen
    from public.sanctions_intl_entries s
    group by s.list_source
  ),
  rows as (
    select e.*
    from public.sanctions_intl_entries e
    where e.removed_on is null and e.countries @> array[upper(p_iso3)]
  ),
  regimes as (
    select r.list_source, g.regime, count(*) as n
    from rows r, unnest(r.regimes) as g(regime)
    group by r.list_source, g.regime
  ),
  ranked as (
    select list_source, regime, n,
           row_number() over (partition by list_source order by n desc, regime) as rk
    from regimes
  )
  select
    r.list_source,
    count(*) as listings,
    count(*) filter (where r.entry_type = 'entity') as entities,
    count(*) filter (where r.entry_type = 'individual') as individuals,
    count(*) filter (
      where r.listed_on >= current_date - 90
         or (r.first_seen >= current_date - 90 and r.first_seen > f.first_seen)
    ) as recent,
    coalesce(
      (select jsonb_agg(jsonb_build_object('regime', k.regime, 'listings', k.n) order by k.rk)
         from ranked k where k.list_source = r.list_source and k.rk <= 5),
      '[]'::jsonb
    ) as top_regimes
  from rows r
  join first_sync f on f.list_source = r.list_source
  group by r.list_source;
$$;

create or replace function public.sanctions_intl_country_counts(p_list text default null)
returns table (country text, listings bigint)
language sql
stable
security definer
set search_path = public
as $$
  select c.country, count(*) as listings
  from public.sanctions_intl_entries e, unnest(e.countries) as c(country)
  where e.removed_on is null
    and (p_list is null or e.list_source = p_list)
    and c.country ~ '^[A-Z]{3}$'
  group by c.country
  order by count(*) desc, c.country
  limit 50;
$$;

revoke all on function public.sanctions_intl_country_summary(text) from public, anon, authenticated;
revoke all on function public.sanctions_intl_country_counts(text) from public, anon, authenticated;
grant execute on function public.sanctions_intl_country_summary(text) to service_role;
grant execute on function public.sanctions_intl_country_counts(text) to service_role;
