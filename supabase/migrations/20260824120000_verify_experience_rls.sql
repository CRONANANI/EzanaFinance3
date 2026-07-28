-- =============================================================================
-- RLS verification pass — experience access backstop (layer 2 of defense-in-depth)
-- =============================================================================
-- The org and partner apps are gated at the route layer server-side (layer 1:
-- membership/partner gates in the layouts). This migration verifies the DATA
-- backstop (layer 2): every MEMBER-SCOPED table has RLS enabled AND does not
-- carry a blanket `using(true)` read policy, so a non-member gets empty results
-- even if a route ever slipped through.
--
-- Table classification (auditable):
--   * MEMBER-SCOPED (below): read/write scoped to auth_org_ids() /
--     auth_manager_org_ids() etc. (see 20260727000000 + the pitch RLS fix). A
--     blanket using(true) on any of these would be a cross-org data leak.
--   * INTENDED PUBLIC-READ: council_elo, council_elo_transactions,
--     council_fund_metrics — the cross-university /council-rankings leaderboard
--     is public by design (admin/public read); writes remain service-role only.
--
-- This block RAISES if the invariant is violated, so drift (a new member-scoped
-- table shipped without RLS, or one given a using(true) read) fails the migration
-- instead of silently leaking. It changes no data and no schema.
-- =============================================================================

do $rls_audit$
declare
  member_scoped text[] := array[
    'org_positions','org_fund_snapshots','org_assignments','org_grades','org_meetings',
    'org_recognition','org_cohorts','org_members','org_teams','org_research_notes',
    'org_team_portfolios','pitch_competitions','pitch_teams','pitch_judges','pitch_scores',
    'pitch_deliverables','partners'
  ];
  public_read text[] := array['council_elo','council_elo_transactions','council_fund_metrics'];
  t text;
  bad text;
begin
  -- 1) Every member-scoped table must exist with RLS enabled.
  foreach t in array member_scoped loop
    if not exists (
      select 1 from pg_class c
      join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
      where c.relname = t and c.relkind = 'r' and c.relrowsecurity
    ) then
      raise exception 'RLS AUDIT: member-scoped table % is missing or has RLS disabled', t;
    end if;
  end loop;

  -- 2) No member-scoped table may carry a blanket using(true) SELECT/ALL policy.
  select string_agg(tablename || '.' || policyname, ', ') into bad
  from pg_policies
  where schemaname = 'public'
    and tablename = any(member_scoped)
    and cmd in ('SELECT', 'ALL')
    and qual = 'true';
  if bad is not null then
    raise exception 'RLS AUDIT: member-scoped table(s) carry a blanket using(true) read policy: %', bad;
  end if;

  raise notice 'RLS AUDIT PASSED — % member-scoped tables RLS-enabled & member-scoped; intended public-read: %',
    array_length(member_scoped, 1), array_to_string(public_read, ', ');
end
$rls_audit$;
