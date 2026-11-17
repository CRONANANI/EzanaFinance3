-- Lobbying: publishing exact legal-name matches, honestly labelled (Nov 17, 2026)
--
-- Follows 20261123090000_lobbying_client_identity.sql. Additive and safe to run twice.
--
-- 1. A published mapping (verified = true) now has one of two statuses:
--      verified       a person reviewed it
--      name_identity  published by the exact legal-name rule: the client's registered name is
--                     the SEC registrant's legal name once case and punctuation are removed,
--                     that name belongs to one ticker, and the ticker and CIK are one-to-one.
--                     This is a name match, not independent confirmation of corporate identity,
--                     and readers say so.
--    'possible' and 'rejected' stay unpublished.
-- 2. New rows default to 'possible'.
-- 3. The lobbying page's "public companies only" filter reads published rows only. Before
--    this it read every row, including name variants awaiting review.
-- 4. lobbying_publish_name_identity() and lobbying_unpublish_name_identity(): the rule and
--    its exact reversal. Service role only. Neither runs on its own.

do $migration$
begin
  if to_regclass('public.lobbying_client_tickers') is null then
    raise notice 'lobbying_client_tickers is not present; skipped';
    return;
  end if;

  alter table public.lobbying_client_tickers drop constraint if exists lobbying_client_tickers_status_check;
  alter table public.lobbying_client_tickers
    add constraint lobbying_client_tickers_status_check
    check (status is null or status in ('verified', 'name_identity', 'possible', 'rejected'));

  alter table public.lobbying_client_tickers drop constraint if exists lobbying_client_tickers_published_has_evidence;
  alter table public.lobbying_client_tickers
    add constraint lobbying_client_tickers_published_has_evidence
    check (
      not verified
      or (status in ('verified', 'name_identity') and relationship is not null
          and evidence is not null and verified_at is not null)
    ) not valid;
  alter table public.lobbying_client_tickers
    validate constraint lobbying_client_tickers_published_has_evidence;

  alter table public.lobbying_client_tickers alter column status set default 'possible';
  update public.lobbying_client_tickers set status = 'possible' where status is null and not verified;
end;
$migration$;

-- 3. The page's public-company filter: published rows only. Rewritten in place, only the
--    one subquery changes; skipped where the function is absent.
do $migration$
declare
  f text;
  def text;
  old_sql constant text := '(select t.client_name from public.lobbying_client_tickers t)';
  new_sql constant text := '(select t.client_name from public.lobbying_client_tickers t where t.verified)';
begin
  foreach f in array array['lobbying_page_scope', 'lobbying_page_ids'] loop
    for def in
      select pg_get_functiondef(p.oid)
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = f
    loop
      if position(old_sql in def) > 0 then
        execute replace(def, old_sql, new_sql);
      end if;
    end loop;
  end loop;
end;
$migration$;

-- 4. The rule. Publishes a 'possible' row only when every check holds:
--    a. lobbying_client_candidates() puts the client in the legal_name_identity tier
--       (exact legal name, one ticker);
--    b. the row's existing ticker is that ticker (no conflicting mapping);
--    c. in sec_fundamentals the ticker has one CIK and the CIK has one ticker;
--    d. the row is not 'rejected' and not already published.
--    The evidence records the rule, what was matched and each check.
create or replace function public.lobbying_publish_name_identity()
returns integer
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
  v_count integer;
begin
  -- materialized: the candidate scan runs once (12s on production), never per row.
  with c as materialized (
    select * from public.lobbying_client_candidates(2000) where tier = 'legal_name_identity'
  ),
  tk as materialized (
    select ticker, count(distinct cik) as ciks from public.sec_fundamentals
     where ticker is not null and cik is not null group by ticker
  ),
  ck as materialized (
    select cik, count(distinct ticker) as tickers from public.sec_fundamentals
     where ticker is not null and cik is not null group by cik
  ),
  ok as (
    select c.client_name, c.ticker, c.cik, c.sec_entity_name
      from c
      join public.lobbying_client_tickers t on t.client_name = c.client_name
      join tk on tk.ticker = c.ticker and tk.ciks = 1
      join ck on ck.cik = c.cik and ck.tickers = 1
     where not t.verified
       and coalesce(t.status, 'possible') = 'possible'
       and upper(t.ticker) = upper(c.ticker)
  )
  update public.lobbying_client_tickers t
     set verified = true,
         status = 'name_identity',
         relationship = 'direct',
         cik = ok.cik,
         sec_entity_name = ok.sec_entity_name,
         company_label = coalesce(t.company_label, ok.sec_entity_name),
         evidence = jsonb_build_object(
           'basis', 'legal_name_identity',
           'note', 'Exact legal-name match. Not independent confirmation of corporate identity.',
           'client_name_as_filed', ok.client_name,
           'matched_to', ok.sec_entity_name,
           'cik', ok.cik,
           'checks', jsonb_build_array(
             'client name equals SEC registrant name after case and punctuation are removed',
             'that name belongs to one ticker',
             'ticker has one CIK and CIK has one ticker',
             'no conflicting existing mapping'
           ),
           'sources', jsonb_build_array('Senate LDA client name', 'SEC registrant name and CIK')
         ),
         verified_at = current_date,
         verified_by = 'legal_name_identity_rule'
    from ok
   where t.client_name = ok.client_name;
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

-- The exact reversal: unpublishes every row the rule published, and nothing else.
create or replace function public.lobbying_unpublish_name_identity()
returns integer
language plpgsql
security invoker
set search_path to 'public'
as $function$
declare
  v_count integer;
begin
  update public.lobbying_client_tickers
     set verified = false, status = 'possible'
   where verified_by = 'legal_name_identity_rule' and status = 'name_identity';
  get diagnostics v_count = row_count;
  return v_count;
end;
$function$;

revoke all on function public.lobbying_publish_name_identity() from public, anon, authenticated;
revoke all on function public.lobbying_unpublish_name_identity() from public, anon, authenticated;
grant execute on function public.lobbying_publish_name_identity() to service_role;
grant execute on function public.lobbying_unpublish_name_identity() to service_role;
