-- Ezana API: insider buying clusters (GET /v1/insider/clusters).
--
-- Issuers where two or more officers or directors bought the stock on the
-- open market (Form 4 code P, acquired, non-derivative) inside one window,
-- with each buyer's role and value.
--
-- A first version (four arguments, no cutoff) was applied by hand in the SQL
-- editor before this file existed. This file records it in the repo and adds
-- p_cutoff, so a delayed API key sees only filings made on or before its
-- cutoff and the window ends there instead of today. The old signature is
-- dropped first so the new one does not become an ambiguous overload.
--
-- Rules:
--   window      transaction_date in [anchor - p_days, anchor], anchor =
--               coalesce(p_cutoff, current_date); with a cutoff, filed_at
--               must also be on or before it
--   buyers      one row per reporter per issuer, kept only when the reporter
--               is an officer or a director (10%-only owners are left out)
--   funds       reporters whose filed name is an entity (LP, LLC, fund,
--               partners, capital, management, holdings, trust and the like)
--               are left out: a fund that sits on a board is not a personal
--               open-market buy
--   cluster     at least greatest(2, p_min_insiders) buyers, and the first to
--               last buy span is at most p_span_days
--
-- Read only. Additive and safe to re-run. Served through the service role.

set check_function_bodies = off;

drop function if exists public.api_insider_clusters(integer, integer, integer, integer);

create or replace function public.api_insider_clusters(
  p_days         integer default 90,
  p_span_days    integer default 30,
  p_min_insiders integer default 2,
  p_limit        integer default 50,
  p_cutoff       date    default null
)
returns table (
  ticker      text,
  issuer      text,
  insiders    integer,
  officers    integer,
  directors   integer,
  total_usd   numeric,
  first_buy   date,
  last_buy    date,
  span_days   integer,
  buyers      jsonb
)
language sql
stable
set search_path = public
as $$
  with b as (
    select upper(t.issuer_ticker)       as ticker,
           max(t.issuer_name)           as issuer,
           t.reporter_cik,
           max(t.reporter_name)         as reporter,
           max(t.reporter_title)        as title,
           bool_or(t.is_officer)        as officer,
           bool_or(t.is_director)       as director,
           bool_or(t.is_ten_pct_owner)  as ten_pct_owner,
           min(t.transaction_date)      as first_buy,
           max(t.transaction_date)      as last_buy,
           sum(t.value_usd)             as value_usd
      from public.sec_insider_transactions t
     where t.transaction_code = 'P'
       and coalesce(t.acquired_disposed, 'A') = 'A'
       and t.table_kind = 'non_derivative'
       and t.issuer_ticker is not null
       and upper(t.issuer_ticker) ~ '^[A-Z][A-Z0-9.\-]{0,9}$'
       and t.transaction_date >= coalesce(p_cutoff, current_date) - greatest(1, least(p_days, 730))
       and t.transaction_date <= coalesce(p_cutoff, current_date)
       and (p_cutoff is null or t.filed_at <= p_cutoff)
       and coalesce(t.reporter_name, '') !~* '\m(L\.?P|L\.?L\.?C|FUND|FUNDS|PARTNERS|CAPITAL|MANAGEMENT|ADVISORS|ADVISERS|HOLDINGS|TRUST|INC|CORP|CORPORATION|LTD|PLC|GROUP)\M'
     group by 1, t.reporter_cik
  )
  select b.ticker,
         max(b.issuer),
         count(*)::int,
         (count(*) filter (where b.officer))::int,
         (count(*) filter (where b.director))::int,
         round(sum(b.value_usd)),
         min(b.first_buy),
         max(b.last_buy),
         (max(b.last_buy) - min(b.first_buy))::int,
         jsonb_agg(
           jsonb_build_object(
             'name', b.reporter,
             'title', b.title,
             'officer', coalesce(b.officer, false),
             'director', coalesce(b.director, false),
             'ten_pct_owner', coalesce(b.ten_pct_owner, false),
             'value_usd', round(b.value_usd),
             'first_buy', b.first_buy,
             'last_buy', b.last_buy
           )
           order by b.value_usd desc nulls last
         )
    from b
   where b.officer or b.director
   group by b.ticker
  having count(*) >= greatest(2, p_min_insiders)
     and (max(b.last_buy) - min(b.first_buy)) <= greatest(0, p_span_days)
   order by 3 desc, 6 desc nulls last, 1
   limit greatest(1, least(p_limit, 200));
$$;

revoke all on function public.api_insider_clusters(integer, integer, integer, integer, date)
  from public, anon, authenticated;
grant execute on function public.api_insider_clusters(integer, integer, integer, integer, date)
  to service_role;
