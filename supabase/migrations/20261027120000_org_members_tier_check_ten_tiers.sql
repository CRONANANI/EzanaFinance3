-- 20261027120000_org_members_tier_check_ten_tiers.sql
-- The org chart and applicant provisioning offer 10 tiers (src/lib/org-hierarchy.js
-- ORG_TIERS); the CHECK from 20260625000000 only allowed 7, so three of them
-- failed with 23514. Existing rows all hold one of the original 7, so the new
-- constraint validates immediately. Idempotent.
-- `if exists` so the file also applies cleanly where org_members is absent (the
-- local RLS harness skips the live_only catalog copy that creates it); on the
-- live database the table exists and the constraint is swapped unconditionally.
alter table if exists public.org_members
  drop constraint if exists org_members_tier_check;

alter table if exists public.org_members
  add constraint org_members_tier_check
  check (
    tier is null
    or tier in (
      'president',
      'vice_president',
      'executive',
      'senior_portfolio_manager',
      'portfolio_manager',
      'junior_portfolio_manager',
      'senior_analyst',
      'quant_analyst',
      'analyst',
      'junior_analyst'
    )
  );
