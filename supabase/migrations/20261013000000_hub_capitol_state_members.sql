-- Capitol Watch hub: trades by state. One row per (state, member) with trade
-- count, disclosed-midpoint volume, buys, sells and the last trade date, for
-- the trailing p_days (null = all time). Read by
-- src/lib/datasets/capitol-hub/state-trades.js with the service role; the
-- loader aggregates the view itself until this is applied. Additive and
-- idempotent. Recorded from the deployed definition (already applied).

create or replace function public.hub_capitol_state_members(p_days integer default null)
returns table (
  state text,
  bioguide_id text,
  member_name text,
  party text,
  chamber text,
  trades bigint,
  volume numeric,
  buys bigint,
  sells bigint,
  last_trade date
)
language sql
stable
set search_path = public
as $$
  select
    t.state,
    t.bioguide_id,
    max(t.member_name) as member_name,
    max(t.party) as party,
    max(t.chamber) as chamber,
    count(*) as trades,
    coalesce(sum(t.amount_mid), 0) as volume,
    count(*) filter (where t.type = 'purchase') as buys,
    count(*) filter (where t.type in ('sale', 'sale_partial')) as sells,
    max(t.transaction_date) as last_trade
  from public.congress_trades_enriched t
  where t.state is not null
    and t.bioguide_id is not null
    and (p_days is null or t.transaction_date >= current_date - p_days)
  group by t.state, t.bioguide_id;
$$;

revoke all on function public.hub_capitol_state_members(integer) from public, anon, authenticated;
grant execute on function public.hub_capitol_state_members(integer) to service_role;
