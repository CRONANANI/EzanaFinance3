-- Lobbying client identity (Nov 17, 2026)
--
-- Sonar's lobbying answer reads public.lobbying_client_tickers where verified = true. Only 35
-- links (33 tickers) were verified, so most companies returned "no disclosures found".
-- This migration adds what a published mapping must carry (the SEC identity it was matched
-- to, the kind of relationship, the evidence, who verified it and when) and a read-only
-- function that proposes matches in tiers. It verifies nothing by itself.
--
-- Additive and idempotent: new nullable columns, one check constraint, one function.
-- Existing rows keep verified as it is. Nothing is deleted.
--
-- Tiers the function returns:
--   legal_name_identity  the client's name is the SEC registrant's name, character for
--                        character once case and punctuation are removed, and that name
--                        belongs to exactly one ticker. Not a fuzzy match.
--   name_variant         equal only after dropping a corporate suffix or a trailing
--                        "and subsidiaries / affiliates". Often right, sometimes a
--                        subsidiary: always needs a person to review.
--   ambiguous            the name maps to more than one ticker.
-- A client in none of these is unmatched.

alter table public.lobbying_client_tickers
  add column if not exists cik text,
  add column if not exists sec_entity_name text,
  add column if not exists relationship text,
  add column if not exists status text,
  add column if not exists evidence jsonb,
  add column if not exists verified_at date,
  add column if not exists verified_by text;

do $$ begin
  alter table public.lobbying_client_tickers
    add constraint lobbying_client_tickers_relationship_check
    check (relationship is null or relationship in ('direct', 'subsidiary'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.lobbying_client_tickers
    add constraint lobbying_client_tickers_status_check
    check (status is null or status in ('verified', 'possible', 'rejected'));
exception when duplicate_object then null; end $$;

-- A mapping is published (verified = true) only with status 'verified', a relationship,
-- evidence and a verification date. Not valid: existing rows are brought into line by the
-- backfill below before the constraint is validated.
do $$ begin
  alter table public.lobbying_client_tickers
    add constraint lobbying_client_tickers_published_has_evidence
    check (
      not verified
      or (status = 'verified' and relationship is not null and evidence is not null and verified_at is not null)
    ) not valid;
exception when duplicate_object then null; end $$;

-- Existing rows: the 33 hand-verified links keep their standing, recorded as such. Rows the
-- old name matcher wrote but nobody verified become 'possible'.
update public.lobbying_client_tickers
   set status = 'verified',
       relationship = coalesce(relationship, 'direct'),
       evidence = coalesce(evidence, jsonb_build_object('basis', 'manual_review', 'note', 'verified by hand before Nov 17, 2026')),
       verified_at = coalesce(verified_at, created_at::date),
       verified_by = coalesce(verified_by, 'manual')
 where verified and status is distinct from 'verified';

update public.lobbying_client_tickers
   set status = 'possible'
 where not verified and status is null;

alter table public.lobbying_client_tickers
  validate constraint lobbying_client_tickers_published_has_evidence;

create or replace function public.lobbying_norm_strict(p text)
returns text language sql immutable as $$
  select btrim(regexp_replace(upper(regexp_replace(coalesce(p, ''), '\s*/[A-Za-z]{2,3}/?\s*$', '')), '[^A-Z0-9]+', ' ', 'g'))
$$;

create or replace function public.lobbying_norm_loose(p text)
returns text language sql immutable as $$
  select btrim(regexp_replace(
    regexp_replace(
      public.lobbying_norm_strict(
        regexp_replace(coalesce(p, ''), '\s+(and|&)\s+(various\s+|its\s+)?(subsidiaries|affiliates|affiliated entities).*$', '', 'i')
      ),
      '\s+(INCORPORATED|INC|CORPORATION|CORP|COMPANY|CO|LLC|LTD|PLC|LP|HOLDINGS|GROUP)\M', '', 'g'),
    '\s+', ' ', 'g'))
$$;

-- Proposed matches between lobbying clients and SEC registrants, in tiers. Read-only.
-- Spend is what the client's filings report from p_since_year on (registrations excluded).
create or replace function public.lobbying_client_candidates(p_since_year int default 2024)
returns table (
  client_name text,
  tier text,
  ticker text,
  cik text,
  sec_entity_name text,
  tickers int,
  spend numeric,
  already_listed boolean
)
language sql stable
set search_path to 'public'
as $function$
  with c as (
    select f.client_name,
           sum(f.amount) filter (where f.filing_year >= p_since_year) as spend,
           public.lobbying_norm_strict(f.client_name) as sk,
           public.lobbying_norm_loose(f.client_name) as lk
      from public.lobbying_filings f
     where not coalesce(f.is_registration, false) and f.client_name is not null
     group by f.client_name
  ),
  e as (
    select distinct s.ticker, s.cik, s.entity_name,
           public.lobbying_norm_strict(s.entity_name) as sk,
           public.lobbying_norm_loose(s.entity_name) as lk
      from public.sec_fundamentals s
     where s.ticker is not null and s.entity_name is not null
  ),
  strict as (
    select c.client_name, c.spend, min(e.ticker) as ticker, min(e.cik) as cik,
           min(e.entity_name) as sec_entity_name, count(distinct e.ticker)::int as tickers
      from c join e on e.sk = c.sk
     where length(c.sk) >= 5
     group by c.client_name, c.spend
  ),
  loose as (
    select c.client_name, c.spend, min(e.ticker) as ticker, min(e.cik) as cik,
           min(e.entity_name) as sec_entity_name, count(distinct e.ticker)::int as tickers
      from c join e on e.lk = c.lk
     where length(c.lk) >= 4
       and not exists (select 1 from strict s where s.client_name = c.client_name)
     group by c.client_name, c.spend
  ),
  u as (
    select client_name, case when tickers = 1 then 'legal_name_identity' else 'ambiguous' end as tier,
           case when tickers = 1 then ticker end as ticker, case when tickers = 1 then cik end as cik,
           case when tickers = 1 then sec_entity_name end as sec_entity_name, tickers, spend
      from strict
    union all
    select client_name, case when tickers = 1 then 'name_variant' else 'ambiguous' end,
           case when tickers = 1 then ticker end, case when tickers = 1 then cik end,
           case when tickers = 1 then sec_entity_name end, tickers, spend
      from loose
  )
  select u.client_name, u.tier, u.ticker, u.cik, u.sec_entity_name, u.tickers,
         coalesce(u.spend, 0),
         exists (select 1 from public.lobbying_client_tickers t where t.client_name = u.client_name)
    from u;
$function$;

revoke all on function public.lobbying_client_candidates(int) from public, anon, authenticated;
grant execute on function public.lobbying_client_candidates(int) to service_role;
