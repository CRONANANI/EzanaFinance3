-- Sonar 6.4: verified industry classification (Nov 28 2026)
--
-- Why: Sonar screened "semiconductor companies", "banks" and "defense contractors" on the
-- whole GICS sector (ticker_sectors holds 11 sectors only), so a semiconductor screen
-- returned software companies. This table holds each listed registrant's SEC Standard
-- Industrial Classification code from EDGAR (data.sec.gov/submissions), the industry it
-- files under. src/lib/sonar/composer/industries.js maps industries to SIC codes; a screen
-- on an industry runs only on companies classified here and never substitutes a sector.
--
-- Filled by /api/cron/sync-company-industry (SEC submissions, 6 requests a second,
-- resumable: rows older than 90 days or missing are refreshed first).
--
-- Additive. Public SEC data: readable by everyone; written by the service role only.

create table if not exists public.company_industry (
  ticker text primary key,
  cik text not null,
  sic text,
  sic_description text,
  entity_name text,
  source text not null default 'sec_submissions',
  verified_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_industry_sic_idx on public.company_industry (sic);
create index if not exists company_industry_verified_idx on public.company_industry (verified_at);

alter table public.company_industry enable row level security;

drop policy if exists company_industry_read on public.company_industry;
create policy company_industry_read on public.company_industry
  for select to anon, authenticated using (true);

revoke insert, update, delete on public.company_industry from anon, authenticated;

comment on table public.company_industry is
  'SEC SIC code per listed registrant (EDGAR submissions). Sonar 6.4 industry universes.';
