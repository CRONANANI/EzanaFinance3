-- Two columns the eleven-column (2008-2014) House index layout carries and the
-- nine-column (2015-2026) one does not, plus a per-year coverage record.
--
-- Background: the Clerk's <YEAR>FD.txt ships in two layouts, and the extra
-- columns sit in the MIDDLE of the row, so the old positional parser shifted on
-- 2008-2014 — reading "Filing Year" as the filing date and FilingDate as the
-- DocID. parse-index.js now resolves columns by header name and carries these
-- two through. Both are nullable: on the nine-column years the source simply
-- does not have them, and null says so rather than inventing a value.

alter table public.house_disclosure_filings
  add column if not exists covered_year integer,
  add column if not exists disclosure_type text;

comment on column public.house_disclosure_filings.covered_year is
  'The Clerk''s "Filing Year" column (2008-2014 layout only): the reporting year the filing covers, distinct from filing_year, which is the bundle year. Null for 2015 onward.';
comment on column public.house_disclosure_filings.disclosure_type is
  'The Clerk''s DisclosureType column (2008-2014 layout only). Null for 2015 onward.';

-- Per-year coverage, written by the ingest route after each year is parsed.
-- This exists so a thin year reads as what it is. The Clerk's 2014 bundle
-- genuinely contains only 11 filings, in both the TXT and the XML; without a
-- recorded count that is indistinguishable from a download that half-failed.
--
-- `filings` and `ptrs` count rows parsed FROM THE SOURCE FILE, which is the
-- honest measure of what the Clerk published for that year.
create table if not exists public.house_disclosure_coverage (
  year      integer primary key,
  filings   integer not null,
  ptrs      integer not null,
  loaded_at timestamptz not null default now()
);

-- Public-read, service-role write — the same pattern as the other Capitol Watch
-- dataset tables (see 20260817000000_house_disclosures.sql).
alter table public.house_disclosure_coverage enable row level security;
drop policy if exists "public read house_disclosure_coverage" on public.house_disclosure_coverage;
create policy "public read house_disclosure_coverage" on public.house_disclosure_coverage for select using (true);
