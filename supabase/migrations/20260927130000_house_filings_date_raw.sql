-- Keep rejected dates auditable, and record per-year what the source actually
-- contained. Written, not executed.
--
-- The Clerk's files carry digit typos in dates — 2013 alone has three
-- '6/14/3013' and three '5/15/2031'. They are shape-valid, so they were being
-- stored as real dates, and one of them is enough to anchor every "latest
-- filing" query to the year 3013. toISO now rejects anything outside
-- 1990..current+1 and the raw string lands here instead of being lost.

alter table public.house_disclosure_filings
  add column if not exists filing_date_raw text;

comment on column public.house_disclosure_filings.filing_date_raw is
  'The source date string, kept ONLY when it was present and rejected as implausible (filing_date is then null). Null for a good date, and null for a row that legitimately carries no date at all, such as a withdrawal.';

-- Two more coverage facts per year.
--
-- ptrs_legacy exists because PTRs are marked two different ways: FilingType
-- 'P' from 2015, and a separate DisclosureType = 'PTR' column for 2008-2014.
-- Splitting the count out makes it visible which signal a year's PTRs came
-- from, so a year reporting zero can be investigated rather than assumed empty.
alter table public.house_disclosure_coverage
  add column if not exists bad_dates integer not null default 0,
  add column if not exists ptrs_legacy integer not null default 0;

comment on column public.house_disclosure_coverage.bad_dates is
  'Rows whose date was present but rejected as implausible. Excludes rows with no date at all (withdrawals), which are not anomalies.';
comment on column public.house_disclosure_coverage.ptrs_legacy is
  'Of this year''s ptrs, how many were identified by the 2008-2014 DisclosureType = PTR signal rather than by FilingType = P.';
