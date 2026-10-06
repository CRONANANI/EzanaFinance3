-- Dimension hubs: EzanaQL views for the new datasets, the widened join-key
-- whitelist, and the two hub linkage functions. Creates views and functions
-- only; changes no data. (Numbered 000900: 000800 was already taken.)

-- EzanaQL views for the new datasets. security_invoker: each reads with the
-- caller's rights. The EzanaQL executor and the hub pages read through the
-- service role, so only service_role is granted.

create or replace view public.ezq_committee_seats
with (security_invoker = true) as
select
  cm.committee_thomas_id,
  c.name                                   as committee,
  c.chamber,
  c.is_subcommittee,
  p.name                                   as parent_committee,
  upper(cm.bioguide_id)                    as bioguide_id,
  coalesce(m.full_name, cm.member_name)    as member_name,
  m.party,
  m.state,
  cm.side,
  cm.rank,
  cm.title
from public.congress_committee_members cm
join public.congress_committees c on c.thomas_id = cm.committee_thomas_id
left join public.congress_committees p on p.thomas_id = c.parent_thomas_id
left join public.congress_members m on m.bioguide_id = cm.bioguide_id;

create or replace view public.ezq_campaign_finance
with (security_invoker = true) as
select
  upper(bioguide_id) as bioguide_id, cycle, candidate_id, name as member_name, party, office, state,
  receipts, disbursements, cash_on_hand_end_period as cash_on_hand,
  individual_itemized_contributions, other_political_committee_contributions as pac_contributions,
  debts_owed_by_committee as debts, coverage_start_date, coverage_end_date
from public.fec_candidate_totals;

create or replace view public.ezq_13f_holdings
with (security_invoker = true) as
select
  h.accession_no,
  f.cik                 as filer_cik,
  f.filer_name,
  f.form_type,
  f.period_of_report,
  f.filed_at,
  h.name_of_issuer      as issuer,
  h.cusip,
  upper(h.ticker)       as ticker,
  h.value_usd,
  h.shares,
  h.share_type,
  h.put_call
from public.sec_13f_holdings h
join public.sec_filings f on f.accession_no = h.accession_no;

create or replace view public.ezq_activist_stakes
with (security_invoker = true) as
select
  a.accession_no,
  f.cik                                       as filer_cik,
  f.filer_name,
  coalesce(a.form_type, f.form_type)          as form_type,
  f.filed_at,
  a.event_date,
  a.subject_name,
  a.subject_cik,
  upper(coalesce(a.subject_ticker, f.ticker)) as ticker,
  a.percent_of_class,
  a.shares,
  a.is_amendment
from public.sec_activist_positions a
join public.sec_filings f on f.accession_no = a.accession_no;

create or replace view public.ezq_etf_holdings
with (security_invoker = true) as
select
  h.series_id,
  f.ticker              as etf_ticker,
  f.fund_name,
  h.report_date,
  h.name                as holding_name,
  upper(h.ticker)       as ticker,
  h.cusip,
  h.value_usd,
  h.pct_value,
  h.asset_category,
  h.country
from public.sec_etf_holdings h
join public.sec_etf_funds f on f.series_id = h.series_id;

revoke all on public.ezq_committee_seats, public.ezq_campaign_finance, public.ezq_13f_holdings,
              public.ezq_activist_stakes, public.ezq_etf_holdings from anon, authenticated;
grant select on public.ezq_committee_seats, public.ezq_campaign_finance, public.ezq_13f_holdings,
               public.ezq_activist_stakes, public.ezq_etf_holdings to service_role;

-- Join-key whitelist for EzanaQL SEMI JOIN. Existing two entries kept.
create or replace function public.ezanaql_matching_keys(
  p_table  text,
  p_column text,
  p_keys   text[]
) returns text[]
language plpgsql
stable
set search_path = public
as $$
declare
  v_keys   text[];
  v_result text[];
begin
  if (p_table, p_column) not in (
    ('usaspending_contract_awards', 'ticker'),
    ('congress_trades_enriched',    'ticker'),
    ('congress_trades_enriched',    'bioguide_id'),
    ('ezq_committee_seats',         'bioguide_id'),
    ('ezq_campaign_finance',        'bioguide_id'),
    ('ezq_13f_holdings',            'ticker'),
    ('ezq_activist_stakes',         'ticker'),
    ('whale_moves',                 'ticker'),
    ('sec_insider_transactions',    'issuer_ticker'),
    ('sec_fundamentals',            'ticker'),
    ('sec_exec_comp',               'ticker'),
    ('ezq_etf_holdings',            'ticker')
  ) then
    raise exception 'ezanaql_matching_keys: %.% is not a declared join key', p_table, p_column
      using errcode = 'check_violation';
  end if;
  if p_keys is null or cardinality(p_keys) = 0 then
    return '{}'::text[];
  end if;
  if cardinality(p_keys) > 5000 then
    raise exception 'ezanaql_matching_keys: at most 5000 keys per call'
      using errcode = 'check_violation';
  end if;

  select array_agg(distinct upper(k)) into v_keys from unnest(p_keys) k where k is not null;

  execute format(
    'select coalesce(array_agg(distinct upper(%I)), ''{}''::text[]) from %I where upper(%I) = any($1)',
    p_column, p_table, p_column
  ) into v_result using v_keys;

  return coalesce(v_result, '{}'::text[]);
end;
$$;

-- Hub linkage: members who traded a stock within N days of a federal
-- contract award to the same (parent) company. One row per member and ticker.
create or replace function public.hub_capitol_trades_near_contracts(
  p_since       date    default (current_date - 365),
  p_window_days integer default 30,
  p_limit       integer default 25
) returns table (
  bioguide_id text, member_name text, party text, ticker text,
  trades integer, first_trade date, last_trade date,
  awards integer, award_value numeric, top_agency text
)
language sql
stable
set search_path = public
as $$
  with t as (
    select bioguide_id, member_name, party, upper(ticker) as ticker, transaction_date
    from congress_trades_enriched
    where ticker is not null and ticker <> '' and transaction_date >= p_since
  ),
  pairs as (
    select t.bioguide_id, t.ticker, t.transaction_date, c.generated_award_id,
           c.award_amount, c.awarding_agency
    from t
    join contract_awards_resolved c
      on upper(c.ticker) = t.ticker
     and c.action_date between t.transaction_date - p_window_days
                           and t.transaction_date + p_window_days
  ),
  awards as (
    select distinct bioguide_id, ticker, generated_award_id, award_amount, awarding_agency
    from pairs
  ),
  agg_awards as (
    select bioguide_id, ticker, count(*)::int as awards, sum(award_amount) as award_value,
           mode() within group (order by awarding_agency) as top_agency
    from awards group by bioguide_id, ticker
  ),
  agg_trades as (
    select p.bioguide_id, p.ticker, count(distinct p.transaction_date)::int as trades,
           min(p.transaction_date) as first_trade, max(p.transaction_date) as last_trade
    from pairs p group by p.bioguide_id, p.ticker
  )
  select a.bioguide_id,
         (select max(member_name) from t where t.bioguide_id = a.bioguide_id),
         (select max(party) from t where t.bioguide_id = a.bioguide_id),
         a.ticker, tr.trades, tr.first_trade, tr.last_trade,
         a.awards, a.award_value, a.top_agency
  from agg_awards a
  join agg_trades tr using (bioguide_id, ticker)
  order by a.award_value desc nulls last
  limit least(greatest(p_limit, 1), 100);
$$;

-- Hub linkage: tickers where big funds are adding AND at least one other
-- group (insiders buying, an activist stake, members buying) is active.
create or replace function public.hub_titans_confluence(
  p_days  integer default 90,
  p_limit integer default 25
) returns table (
  ticker text, whale_filers integer, whale_value numeric, latest_quarter text,
  insider_buys integer, insider_buy_value numeric, insider_sells integer,
  activist_stakes integer, congress_buys integer, signals integer
)
language sql
stable
set search_path = public
as $$
  with w as (
    select upper(ticker) as ticker, count(distinct filer_cik)::int as filers,
           sum(value_usd) as val, max(quarter) as q
    from whale_moves
    where ticker is not null and change_type <> 'trimmed'
      and filed_at >= current_date - (p_days + 45)
    group by 1
  ),
  i as (
    select upper(issuer_ticker) as ticker,
           count(*) filter (where transaction_code = 'P')::int as buys,
           sum(value_usd) filter (where transaction_code = 'P') as buy_val,
           count(*) filter (where transaction_code = 'S')::int as sells
    from sec_insider_transactions
    where issuer_ticker is not null and transaction_date >= current_date - p_days
    group by 1
  ),
  a as (
    select ticker, count(*)::int as n
    from ezq_activist_stakes
    where ticker is not null and filed_at >= current_date - 180
    group by 1
  ),
  c as (
    select upper(ticker) as ticker, count(*)::int as n
    from congress_trades_enriched
    where ticker is not null and type = 'purchase' and transaction_date >= current_date - p_days
    group by 1
  )
  select w.ticker, w.filers, w.val, w.q,
         coalesce(i.buys, 0), i.buy_val, coalesce(i.sells, 0),
         coalesce(a.n, 0), coalesce(c.n, 0),
         ((coalesce(i.buys, 0) > 0)::int + (coalesce(a.n, 0) > 0)::int + (coalesce(c.n, 0) > 0)::int)
  from w
  left join i using (ticker)
  left join a using (ticker)
  left join c using (ticker)
  where coalesce(i.buys, 0) + coalesce(a.n, 0) + coalesce(c.n, 0) > 0
  order by 10 desc, w.filers desc, w.val desc nulls last
  limit least(greatest(p_limit, 1), 100);
$$;

revoke all on function public.hub_capitol_trades_near_contracts(date, integer, integer) from public, anon, authenticated;
revoke all on function public.hub_titans_confluence(integer, integer) from public, anon, authenticated;
grant execute on function public.hub_capitol_trades_near_contracts(date, integer, integer) to service_role;
grant execute on function public.hub_titans_confluence(integer, integer) to service_role;
