-- The company card behind a clickable EzanaQL result row on the contracts
-- page: for one ticker, the awards in the query's window and the members who
-- still hold the stock, with their purchase dates for the price chart.
--
-- One RPC, one round trip. Reads only the public views the engine already
-- uses (contract_awards_resolved, congress_open_positions) plus congress_trades
-- for the purchase markers and congress_members for portraits.
--
--   select public.contractor_company_card('LMT', '2021-10-03');
--
-- Shape:
--   { ticker, since, total, awardCount, recipientCount, firstDate, lastDate,
--     awards:    [{ id, recipient, agency, amount, date }]        top p_limit by amount
--     names:     [{ name, amount, n }]                             recipients resolved to this ticker
--     agencies:  [{ agency, amount, n }]
--     holders:   [{ bioguide_id, name, chamber, party, state, photo_url,
--                   est_value, first_buy, last_trade, last_action, trades }]
--     purchases: [{ bioguide_id, date, amount }] }                 every purchase of the ticker by a current holder

create or replace function public.contractor_company_card(
  p_ticker text,
  p_since  date default null,
  p_limit  integer default 25
) returns jsonb
language sql
stable
set search_path = public
as $$
  with a as (
    select *
    from contract_awards_resolved
    where ticker = upper(p_ticker)
      and (p_since is null or action_date >= p_since)
  ),
  tot as (
    select coalesce(sum(award_amount), 0) as total,
           count(*)                       as n,
           count(distinct recipient_name) as recipients,
           min(action_date)               as first_date,
           max(action_date)               as last_date
    from a
  ),
  awards as (
    select jsonb_agg(jsonb_build_object(
             'id', x.generated_award_id,
             'recipient', x.recipient_name,
             'agency', x.awarding_agency,
             'amount', x.award_amount,
             'date', x.action_date::text)
           order by x.award_amount desc) as j
    from (select * from a order by award_amount desc limit greatest(1, least(p_limit, 100))) x
  ),
  names as (
    select jsonb_agg(jsonb_build_object('name', x.name, 'amount', x.amount, 'n', x.n)
           order by x.amount desc) as j
    from (select recipient_name as name, sum(award_amount) as amount, count(*) as n
          from a group by 1 order by 2 desc limit 8) x
  ),
  agencies as (
    select jsonb_agg(jsonb_build_object('agency', x.agency, 'amount', x.amount, 'n', x.n)
           order by x.amount desc) as j
    from (select awarding_agency as agency, sum(award_amount) as amount, count(*) as n
          from a group by 1 order by 2 desc limit 6) x
  ),
  h as (
    select o.*, m.photo_url
    from congress_open_positions o
    left join congress_members m on m.bioguide_id = o.bioguide_id
    where o.ticker = upper(p_ticker)
  ),
  holders as (
    select jsonb_agg(jsonb_build_object(
             'bioguide_id', h.bioguide_id,
             'name', h.member_name,
             'chamber', h.chamber,
             'party', h.party,
             'state', h.state,
             'photo_url', h.photo_url,
             'est_value', h.est_value,
             'first_buy', h.first_buy::text,
             'last_trade', h.last_date::text,
             'last_action', h.last_type,
             'trades', h.trades)
           order by h.est_value desc, h.member_name) as j
    from h
  ),
  purchases as (
    select jsonb_agg(jsonb_build_object(
             'bioguide_id', t.bioguide_id,
             'date', t.transaction_date::text,
             'amount', t.amount_mid)
           order by t.transaction_date) as j
    from congress_trades t
    where upper(t.ticker) = upper(p_ticker)
      and t.type = 'purchase'
      and t.bioguide_id in (select bioguide_id from h)
  )
  select jsonb_build_object(
    'ticker',         upper(p_ticker),
    'since',          p_since,
    'total',          (select total from tot),
    'awardCount',     (select n from tot),
    'recipientCount', (select recipients from tot),
    'firstDate',      (select first_date::text from tot),
    'lastDate',       (select last_date::text from tot),
    'awards',         coalesce((select j from awards), '[]'::jsonb),
    'names',          coalesce((select j from names), '[]'::jsonb),
    'agencies',       coalesce((select j from agencies), '[]'::jsonb),
    'holders',        coalesce((select j from holders), '[]'::jsonb),
    'purchases',      coalesce((select j from purchases), '[]'::jsonb)
  );
$$;

grant execute on function public.contractor_company_card(text, date, integer) to anon, authenticated;
