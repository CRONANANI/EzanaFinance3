-- Titans Shadow: Schedule 13D / 13G parser v2.
--
-- NOT executed by the implementer. Noah applies it by hand in the SQL Editor,
-- BEFORE deploying the code that writes these columns (the hourly ingest
-- upserts them; without the columns every activist upsert fails).
--
-- Adds the fields the structured filings already carry and the confirmed
-- investor identity:
--   filer_name / filer_cik / filer_source  the investor, from the cover
--       ('cover_cik' | 'cover_first') or, for legacy filings, the SEC
--       header's FILED BY block ('sec_header'); null = not confirmed
--   amendment_no, person_types (Row 14 / Row 12 codes), fund_sources (13D
--       Row 4 codes), funds_source_text (13D Item 3), transaction_purpose
--       (13D Item 4, verbatim), purpose_tags (keyword tags, boilerplate
--       removed), g_rules (13G basis: 13d-1(b) / (c) / (d)), member_of_group,
--       the lead person's sole / shared voting and dispositive power
--   parser_version: rows below the code's SCHEDULE13_PARSER_VERSION (2) are
--       re-read from EDGAR by the hourly ingest, newest first.
--
-- Idempotent. Existing rows get parser_version null and are reparsed.

alter table public.sec_activist_positions
  add column if not exists filer_name          text,
  add column if not exists filer_cik           text,
  add column if not exists filer_source        text,
  add column if not exists amendment_no        integer,
  add column if not exists person_types        text[] not null default '{}',
  add column if not exists fund_sources        text[] not null default '{}',
  add column if not exists funds_source_text   text,
  add column if not exists transaction_purpose text,
  add column if not exists purpose_tags        text[] not null default '{}',
  add column if not exists g_rules             text[] not null default '{}',
  add column if not exists member_of_group     boolean,
  add column if not exists sole_voting         numeric,
  add column if not exists shared_voting       numeric,
  add column if not exists sole_dispositive    numeric,
  add column if not exists shared_dispositive  numeric,
  add column if not exists parser_version      smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sec_activist_positions_filer_source_chk'
  ) then
    alter table public.sec_activist_positions
      add constraint sec_activist_positions_filer_source_chk
      check (filer_source is null or filer_source in ('cover_cik', 'cover_first', 'sec_header'));
  end if;
end $$;

-- Reparse queue and campaign grouping (investor x target).
create index if not exists sec_activist_positions_parser_version_idx
  on public.sec_activist_positions (parser_version);
create index if not exists sec_activist_positions_filer_cik_idx
  on public.sec_activist_positions (filer_cik) where filer_cik is not null;
create index if not exists sec_activist_positions_campaign_idx
  on public.sec_activist_positions (filer_cik, subject_cusip);

-- Card filters (Stated Intent, person type, 13G basis).
create index if not exists sec_activist_positions_purpose_tags_gin
  on public.sec_activist_positions using gin (purpose_tags);
create index if not exists sec_activist_positions_person_types_gin
  on public.sec_activist_positions using gin (person_types);
create index if not exists sec_activist_positions_g_rules_gin
  on public.sec_activist_positions using gin (g_rules);

-- Read view (EzanaQL, the Ezana API and the Titans hub). Existing columns keep
-- their names, order and types; new columns are appended at the end.
-- filer_name / filer_cik now prefer the confirmed investor. A v2 row with no
-- confirmed investor returns null rather than the EDGAR index name, which for
-- a 13D/13G can be the target company. Rows still waiting for their reparse
-- keep the old value until the ingest reaches them.
create or replace view public.ezq_activist_stakes
with (security_invoker = true) as
select
  a.accession_no,
  case
    when coalesce(a.parser_version, 0) >= 2 then a.filer_cik
    else coalesce(a.filer_cik, f.cik)
  end                                         as filer_cik,
  case
    when coalesce(a.parser_version, 0) >= 2 then a.filer_name
    else coalesce(a.filer_name, f.filer_name)
  end                                         as filer_name,
  coalesce(a.form_type, f.form_type)          as form_type,
  f.filed_at,
  a.event_date,
  a.subject_name,
  a.subject_cik,
  upper(coalesce(a.subject_ticker, f.ticker)) as ticker,
  a.percent_of_class,
  a.shares,
  a.is_amendment,
  -- parser v2 (appended)
  (a.filer_name is not null)                  as filer_confirmed,
  a.filer_source,
  a.amendment_no,
  array_to_string(a.person_types, ',')        as person_types,
  array_to_string(a.fund_sources, ',')        as fund_sources,
  array_to_string(a.purpose_tags, ',')        as purpose_tags,
  case
    when cardinality(a.g_rules) = 0 then null
    when cardinality(a.g_rules) > 1 then 'mixed'
    when a.g_rules[1] = '13d-1(b)' then 'qualified_institution'
    when a.g_rules[1] = '13d-1(c)' then 'passive'
    when a.g_rules[1] = '13d-1(d)' then 'exempt'
  end                                         as g_basis,
  a.member_of_group,
  a.sole_voting,
  a.shared_voting,
  a.sole_dispositive,
  a.shared_dispositive,
  a.parser_version
from public.sec_activist_positions a
join public.sec_filings f on f.accession_no = a.accession_no;

-- Check after applying:
--   select parser_version, count(*) from public.sec_activist_positions group by 1;
--   (null = waiting for reparse; 2 = done. The ingest response reports
--    activist_reparsed per run.)
