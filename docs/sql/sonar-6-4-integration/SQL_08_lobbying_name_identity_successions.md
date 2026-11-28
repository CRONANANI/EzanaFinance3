# SQL 08: lobbying name-identity rule aware of verified successions

Run **before** the predecessor backfill. It replaces `public.lobbying_publish_name_identity()` from migration `20261124090000`. The deployed body matches that migration byte for byte (checked Nov 28 2026 by hash). The rule has four changes and is otherwise identical:

- a verified predecessor CIK does not count as a second CIK for its ticker, in check (c) "ticker has one CIK and CIK has one ticker";
- the CIK-per-ticker and ticker-per-CIK counts both ignore predecessor CIKs;
- a lobbying client is never published against a predecessor CIK by name alone. Exxon Mobil Corp (CIK 34088) is now a subsidiary of ExxonMobil Holdings Corp, so publishing it would need a reviewed parent and subsidiary relationship, not `relationship = 'direct'`;
- with zero predecessor rows in `sec_fundamentals` (true today), it publishes exactly what the current rule publishes.

**Why it matters:** without this change, the backfill would give XOM, DMRC and XPRO a second CIK in `sec_fundamentals`. The current rule would then stop publishing any further name matches for those three tickers. That is safe, because it fails closed, but it silently loses coverage.

**To roll back:** re-run the function block from migration `20261124090000`.

```sql
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
  with pred as materialized (
    -- Sonar 6.4 integration: CIKs of verified predecessor registrants (Form 8-K12B
    -- successions). Their filings map to the successor's ticker for earlier periods, so they
    -- must not count as a second CIK for that ticker, and a client is never published
    -- against a predecessor CIK by name alone.
    select predecessor_cik as cik from public.sec_registrant_successions where verified
  ),
  c as materialized (
    select * from public.lobbying_client_candidates(2000) where tier = 'legal_name_identity'
  ),
  tk as materialized (
    select ticker, count(distinct cik) as ciks from public.sec_fundamentals
     where ticker is not null and cik is not null
       and cik not in (select cik from pred)
     group by ticker
  ),
  ck as materialized (
    select cik, count(distinct ticker) as tickers from public.sec_fundamentals
     where ticker is not null and cik is not null
       and cik not in (select cik from pred)
     group by cik
  ),
  ok as (
    select c.client_name, c.ticker, c.cik, c.sec_entity_name
      from c
      join public.lobbying_client_tickers t on t.client_name = c.client_name
      join tk on tk.ticker = c.ticker and tk.ciks = 1
      join ck on ck.cik = c.cik and ck.tickers = 1
     where not t.verified
       and c.cik not in (select cik from pred)
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
```
