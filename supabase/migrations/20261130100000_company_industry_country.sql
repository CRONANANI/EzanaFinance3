-- Sonar 6.4 hardening: country of a registrant's business address (Nov 28 2026)
--
-- Why: "Which Canadian banks grew revenue the most?" must screen Canadian banks, never all
-- banks. EDGAR submissions carry the business address state/country code (US states,
-- Canadian provinces A0-B0, other countries) and the state of incorporation.
-- /api/cron/sync-company-industry writes these when the columns exist and refreshes rows
-- read before they existed first. Additive; readable like the rest of the table.

alter table public.company_industry
  add column if not exists business_state_code text,
  add column if not exists business_country text,
  add column if not exists incorporation_state_code text;

create index if not exists company_industry_country_idx
  on public.company_industry (business_country);

comment on column public.company_industry.business_country is
  'ISO2 country of the EDGAR business address (US, CA); null for other or unknown codes.';
comment on column public.company_industry.business_state_code is
  'EDGAR business address stateOrCountry code as filed.';
