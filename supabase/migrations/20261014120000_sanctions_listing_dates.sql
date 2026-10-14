-- Sanctions & Trade Policy: when each OFAC SDN entry was first published.
-- sanctions_entries only knows when Ezana first saw an entry (the baseline
-- load put every row on one day), so the trend card needs OFAC's own date.
-- /api/cron/ingest-ofac-dates fills this from SDN_ADVANCED.XML, where each
-- SanctionsEntry carries an EntryEvent date and a ProfileID equal to the
-- legacy ent_num. Additive and idempotent. Service role only: RLS is on and
-- no policy grants anon or authenticated access.

create table if not exists public.sanctions_listing_dates (
  ent_num integer primary key,
  listed_on date not null,
  synced_at timestamptz not null default now()
);

create index if not exists sanctions_listing_dates_listed_on_idx
  on public.sanctions_listing_dates (listed_on);

alter table public.sanctions_listing_dates enable row level security;

-- New listings per address country per month, for the trend card. Every
-- listing counts in the month OFAC published it, delisted or not: the card
-- measures how hard a country is being sanctioned, not what is still active.
create or replace function public.sanctions_country_trend(p_months integer default 24)
returns table (country text, month date, added integer)
language sql
stable
security definer
set search_path = public
as $$
  select c as country,
         date_trunc('month', d.listed_on)::date as month,
         count(*)::integer as added
  from public.sanctions_entries e
  join public.sanctions_listing_dates d on d.ent_num = e.ent_num
  cross join lateral unnest(e.countries) as c
  where d.listed_on >= (date_trunc('month', now()) - make_interval(months => greatest(1, least(p_months, 120))))::date
  group by 1, 2;
$$;

revoke all on function public.sanctions_country_trend(integer) from public, anon, authenticated;
grant execute on function public.sanctions_country_trend(integer) to service_role;
