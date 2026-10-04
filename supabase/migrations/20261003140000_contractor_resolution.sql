-- Contractor → public company resolution.
--
-- USAspending names the legal entity that signed each award ("CACI NSS, LLC",
-- "FEDEX SUPPLY CHAIN DISTRIBUTION SYSTEM, INC."), never a ticker, and never
-- the parent on the search endpoint. Three pieces turn that into a ticker:
--
--   1. usaspending_contract_awards.recipient_id — the recipient hash the search
--      endpoint returns when asked (…-C child / -P parent / -R neither). Both
--      ingest routes now request and store it.
--   2. contractor_recipients — one row per recipient_id, filled by
--      /api/cron/resolve-contractor-recipients from GET /api/v2/recipient/{id}/,
--      which carries parent_name / parent_uei. The resolved ticker lives here
--      too, so the per-award view is a join on an indexed key, never a
--      per-row name computation.
--   3. contractor_tickers (exact normalised name → ticker, or → private) and
--      contractor_ticker_prefixes (name starts with … → ticker), seeded from
--      the exchange listings plus a hand-checked list of subsidiaries and
--      known-private contractors. contractor_resolve_tickers() applies them:
--      exact on parent, exact on recipient, prefix on parent, prefix on
--      recipient, in that order.
--
-- contract_awards_resolved is the view EzanaQL's gov.contracts binds to:
-- ticker = resolved ticker, else the legacy substring-map ticker already on
-- the row; parent = the USAspending parent name; is_public = true / false /
-- null (unknown). Nothing is fabricated: a name that matches nothing stays
-- null, and ticker_source says how each ticker was arrived at.

-- ── 1. recipient_id on the awards ────────────────────────────────────────
alter table public.usaspending_contract_awards
  add column if not exists recipient_id text;
create index if not exists idx_usaspending_awards_recipient_id
  on public.usaspending_contract_awards (recipient_id) where recipient_id is not null;

-- ── name normalisation: one definition, used by the seed and the resolver ─
-- Mirrors nameKey() in src/lib/contractors/name-key.js exactly (the check
-- script asserts the two agree on a fixed corpus). Upper-case, "&" → AND,
-- punctuation → space, corporate suffixes / share-class words / bare numbers
-- dropped, whitespace collapsed.
create or replace function public.contractor_name_key(p_name text)
returns text
language sql
immutable
parallel safe
as $$
  select btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(
    upper(replace(coalesce(p_name, ''), '&', ' AND ')),
    '[^A-Z0-9 ]', ' ', 'g'),
    '\m(INCORPORATED|INC|CORPORATION|CORP|COMPANY|CO|LLC|LLP|LTD|LIMITED|PLC|LP|THE|HOLDINGS|HOLDING|GROUP|INTERNATIONAL|INTL|AND|OF|COMMON|STOCK|CLASS|ORDINARY|SHARES|SHARE|DEPOSITARY|EACH|REPRESENTING|AMERICAN|ADR|ADS|NV|SA|AG|SE|USA|US|A|B|C)\M', ' ', 'g'),
    '\m[0-9]+\M', ' ', 'g'),
    '\s+', ' ', 'g'))
$$;

-- ── 2. recipients, from the USAspending recipient profile ────────────────
create table if not exists public.contractor_recipients (
  recipient_id     text primary key,
  name             text,
  uei              text,
  recipient_level  text,                     -- 'P' | 'C' | 'R'
  parent_id        text,
  parent_name      text,
  parent_uei       text,
  business_types   text[],
  name_key         text generated always as (public.contractor_name_key(name)) stored,
  parent_key       text generated always as (public.contractor_name_key(parent_name)) stored,
  ticker           text,                     -- resolved; null = none / private / unknown
  is_public        boolean,                  -- null = unknown
  ticker_source    text,                     -- 'exact:parent' | 'exact:name' | 'prefix:parent' | 'prefix:name'
  error            text,                     -- last fetch failure, e.g. 'http 404'
  resolved_at      timestamptz not null default now(),
  tickered_at      timestamptz
);
create index if not exists idx_contractor_recipients_parent_key on public.contractor_recipients (parent_key);
create index if not exists idx_contractor_recipients_name_key   on public.contractor_recipients (name_key);
create index if not exists idx_contractor_recipients_ticker     on public.contractor_recipients (ticker) where ticker is not null;

-- ── 3. the mapping tables ────────────────────────────────────────────────
create table if not exists public.contractor_tickers (
  name_key   text primary key,               -- contractor_name_key(company or recipient name)
  ticker     text,                           -- null when is_public = false
  company    text,
  is_public  boolean not null,
  source     text not null,                  -- 'exchange' (listing name match) | 'manual'
  updated_at timestamptz not null default now(),
  check (is_public or ticker is null)
);
create table if not exists public.contractor_ticker_prefixes (
  prefix_key text primary key,               -- name_key starts with this
  ticker     text not null,
  source     text not null default 'manual',
  updated_at timestamptz not null default now()
);

-- Fills ticker / is_public / ticker_source on every recipient row that has
-- not been resolved since the mapping tables last changed. Idempotent; the
-- resolver cron calls it after each batch, and it can be re-run after a
-- manual correction to contractor_tickers (set tickered_at = null first).
create or replace function public.contractor_resolve_tickers()
returns integer
language sql
volatile
set search_path = public
as $$
  with pick as (
    select r.recipient_id,
      coalesce(ep.ticker, en.ticker, pp.ticker, pn.ticker)                       as ticker,
      coalesce(ep.is_public, en.is_public,
               case when pp.ticker is not null or pn.ticker is not null then true end) as is_public,
      case
        when ep.name_key is not null then 'exact:parent'
        when en.name_key is not null then 'exact:name'
        when pp.ticker   is not null then 'prefix:parent'
        when pn.ticker   is not null then 'prefix:name'
      end as ticker_source
    from contractor_recipients r
    left join contractor_tickers ep on ep.name_key = r.parent_key and r.parent_key <> ''
    left join contractor_tickers en on en.name_key = r.name_key   and r.name_key   <> ''
    left join lateral (
      select p.ticker from contractor_ticker_prefixes p
      where r.parent_key <> '' and (r.parent_key = p.prefix_key or r.parent_key like p.prefix_key || ' %')
      order by length(p.prefix_key) desc limit 1
    ) pp on true
    left join lateral (
      select p.ticker from contractor_ticker_prefixes p
      where r.name_key <> '' and (r.name_key = p.prefix_key or r.name_key like p.prefix_key || ' %')
      order by length(p.prefix_key) desc limit 1
    ) pn on true
    where r.tickered_at is null
  ),
  upd as (
    update contractor_recipients r
       set ticker = pick.ticker,
           is_public = pick.is_public,
           ticker_source = pick.ticker_source,
           tickered_at = now()
      from pick
     where pick.recipient_id = r.recipient_id
     returning 1
  )
  select count(*)::integer from upd;
$$;

-- Which recipient_ids still need a profile fetch, biggest dollars first, so
-- the first batches cover most of the spend. Used by the resolver cron.
create or replace function public.contractor_recipients_todo(p_limit integer default 150)
returns table (recipient_id text, recipient_name text, total numeric)
language sql
stable
set search_path = public
as $$
  select a.recipient_id, max(a.recipient_name), sum(a.award_amount)
  from usaspending_contract_awards a
  left join contractor_recipients r on r.recipient_id = a.recipient_id
  where a.recipient_id is not null and r.recipient_id is null
  group by a.recipient_id
  order by 3 desc
  limit greatest(1, least(p_limit, 1000));
$$;

-- ── 4. the resolved view ─────────────────────────────────────────────────
-- Awards that have a recipient_id resolve through contractor_recipients.
-- Awards ingested before recipient_id existed fall back to an exact name
-- match, then to the legacy substring-map ticker on the row.
create or replace view public.contract_awards_resolved
with (security_invoker = true) as
select
  a.generated_award_id,
  a.award_id_piid,
  a.recipient_name,
  a.recipient_id,
  coalesce(r.parent_name, a.recipient_name)                 as parent_name,
  a.award_amount,
  a.awarding_agency,
  a.awarding_sub_agency,
  a.funding_agency,
  a.action_date,
  a.award_type,
  a.fiscal_year,
  coalesce(r.ticker, t.ticker, a.ticker)                    as ticker,
  coalesce(r.is_public, t.is_public,
           case when a.ticker is not null then true end)    as is_public,
  coalesce(r.ticker_source,
           case when t.name_key is not null then 'exact:name'
                when a.ticker is not null then 'legacy' end) as ticker_source,
  a.synced_at
from public.usaspending_contract_awards a
left join public.contractor_recipients r on r.recipient_id = a.recipient_id
left join public.contractor_tickers t
       on r.recipient_id is null
      and t.name_key = public.contractor_name_key(a.recipient_name);

grant select on public.contractor_recipients, public.contractor_tickers,
                public.contractor_ticker_prefixes, public.contract_awards_resolved
  to anon, authenticated;
alter table public.contractor_recipients      enable row level security;
alter table public.contractor_tickers         enable row level security;
alter table public.contractor_ticker_prefixes enable row level security;
drop policy if exists "public read contractor_recipients" on public.contractor_recipients;
create policy "public read contractor_recipients" on public.contractor_recipients for select using (true);
drop policy if exists "public read contractor_tickers" on public.contractor_tickers;
create policy "public read contractor_tickers" on public.contractor_tickers for select using (true);
drop policy if exists "public read contractor_ticker_prefixes" on public.contractor_ticker_prefixes;
create policy "public read contractor_ticker_prefixes" on public.contractor_ticker_prefixes for select using (true);
-- Writes: service role only (the resolver cron and the seed script).
revoke insert, update, delete on public.contractor_recipients, public.contractor_tickers,
                                public.contractor_ticker_prefixes from anon, authenticated;
grant execute on function public.contractor_name_key(text) to anon, authenticated;

-- EzanaQL's SEMI JOIN helper now also accepts the resolved view.
create or replace function public.ezanaql_matching_keys(
  p_table  text,
  p_column text,
  p_keys   text[]
) returns text[]
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_keys   text[];
  v_result text[];
begin
  if (p_table, p_column) not in (
    ('usaspending_contract_awards', 'ticker'),
    ('contract_awards_resolved',    'ticker'),
    ('congress_trades_enriched',    'ticker')
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
