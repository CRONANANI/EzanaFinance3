-- Sonar for organizations, part 3 (Nov 2026): the fund mandate Sonar reads.
--
-- "Should our fund invest in NVIDIA?" is answered against the fund's own
-- mandate: Sonar checks the company against these limits and the fund's IPS
-- rules (org_ips_rules) before it writes anything, then tests the company
-- against the written thesis. Executives edit them in Settings, Fund
-- Configuration (PATCH /api/org/fund-config). Every column is optional: a
-- fund with none set gets the IPS checks only.
--
-- Additive and idempotent.

alter table if exists public.org_fund_config
  add column if not exists investment_thesis text
    check (investment_thesis is null or char_length(investment_thesis) <= 4000),
  add column if not exists mandate_universe text
    check (mandate_universe is null or char_length(mandate_universe) <= 300),
  add column if not exists mandate_horizon text
    check (mandate_horizon is null or char_length(mandate_horizon) <= 80),
  add column if not exists investment_style text
    check (investment_style is null or char_length(investment_style) <= 80),
  add column if not exists focus_sectors text[] not null default '{}',
  add column if not exists excluded_sectors text[] not null default '{}',
  add column if not exists min_market_cap_musd numeric
    check (min_market_cap_musd is null or min_market_cap_musd >= 0);
