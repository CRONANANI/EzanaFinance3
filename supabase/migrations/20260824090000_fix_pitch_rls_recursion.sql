-- Fix "infinite recursion detected in policy for relation pitch_competitions".
--
-- Two recursion sources in the pitch_* / council policies:
--   1. Inline `select org_id from org_members where user_id=auth.uid()` subqueries —
--      the inner select is itself under org_members' RLS. Fixed platform-wide in
--      20260727000000 with SECURITY DEFINER helpers; the competition migrations
--      reintroduced the anti-pattern. Route them through the helpers instead:
--        auth_org_ids() / auth_manager_org_ids() / auth_executive_org_ids().
--   2. pc-read subqueried public.pitch_teams, whose own read policy subqueries
--      pitch_competitions → a mutual cycle Postgres reports on pitch_competitions.
--      Broken with a definer helper (auth_pitch_participant_comp_ids) so
--      pitch_competitions' policy references NO RLS-enabled table. Every other
--      policy may then reference pitch_competitions safely (pc-read is helper-only,
--      an upward DAG with no back-references).
--
-- Also adds WITH CHECK to write / FOR ALL policies — an INSERT must satisfy a
-- WITH CHECK, and the original write policies had only USING, so creating a
-- competition (or any child row) could be denied even once recursion cleared.

-- ── definer helper: competitions the caller's org has a team in (bypasses RLS) ──
create or replace function public.auth_pitch_participant_comp_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.competition_id
  from public.pitch_teams t
  where t.org_id in (select public.auth_org_ids())
$$;
revoke all on function public.auth_pitch_participant_comp_ids() from public;
grant execute on function public.auth_pitch_participant_comp_ids() to authenticated, anon;

-- ── pitch_competitions ──
drop policy if exists "pc read host or participant" on public.pitch_competitions;
create policy "pc read host or participant" on public.pitch_competitions for select using (
  host_org_id in (select public.auth_org_ids())
  or id in (select public.auth_pitch_participant_comp_ids())
);
drop policy if exists "pc write host managers" on public.pitch_competitions;
create policy "pc write host managers" on public.pitch_competitions for all
  using (host_org_id in (select public.auth_manager_org_ids()))
  with check (host_org_id in (select public.auth_manager_org_ids()));

-- ── pitch_rounds ──
drop policy if exists "prd read" on public.pitch_rounds;
create policy "prd read" on public.pitch_rounds for select using (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (select public.auth_org_ids())
       or c.id in (select public.auth_pitch_participant_comp_ids())
  )
);
drop policy if exists "prd write" on public.pitch_rounds;
create policy "prd write" on public.pitch_rounds for all
  using (competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids())))
  with check (competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids())));

-- ── pitch_rooms ──
drop policy if exists "prm read" on public.pitch_rooms;
create policy "prm read" on public.pitch_rooms for select using (
  round_id in (
    select r.id from public.pitch_rounds r
    join public.pitch_competitions c on c.id = r.competition_id
    where c.host_org_id in (select public.auth_org_ids())
       or c.id in (select public.auth_pitch_participant_comp_ids())
  )
);
drop policy if exists "prm write" on public.pitch_rooms;
create policy "prm write" on public.pitch_rooms for all
  using (round_id in (select r.id from public.pitch_rounds r join public.pitch_competitions c on c.id = r.competition_id where c.host_org_id in (select public.auth_manager_org_ids())))
  with check (round_id in (select r.id from public.pitch_rounds r join public.pitch_competitions c on c.id = r.competition_id where c.host_org_id in (select public.auth_manager_org_ids())));

-- ── pitch_teams ──
drop policy if exists "pt read host or own org" on public.pitch_teams;
create policy "pt read host or own org" on public.pitch_teams for select using (
  competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_org_ids()))
  or org_id in (select public.auth_org_ids())
);
drop policy if exists "pt write host managers" on public.pitch_teams;
create policy "pt write host managers" on public.pitch_teams for all
  using (competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids())))
  with check (competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids())));

-- ── pitch_team_members ──
drop policy if exists "ptm read" on public.pitch_team_members;
create policy "ptm read" on public.pitch_team_members for select using (
  team_id in (
    select t.id from public.pitch_teams t
    join public.pitch_competitions c on c.id = t.competition_id
    where c.host_org_id in (select public.auth_org_ids())
       or t.org_id in (select public.auth_org_ids())
  )
);
drop policy if exists "ptm write host managers" on public.pitch_team_members;
create policy "ptm write host managers" on public.pitch_team_members for all
  using (team_id in (select t.id from public.pitch_teams t join public.pitch_competitions c on c.id = t.competition_id where c.host_org_id in (select public.auth_manager_org_ids())))
  with check (team_id in (select t.id from public.pitch_teams t join public.pitch_competitions c on c.id = t.competition_id where c.host_org_id in (select public.auth_manager_org_ids())));

-- ── pitch_judges ──
drop policy if exists "pj read host" on public.pitch_judges;
create policy "pj read host" on public.pitch_judges for select using (
  competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_org_ids()))
);
drop policy if exists "pj write host managers" on public.pitch_judges;
create policy "pj write host managers" on public.pitch_judges for all
  using (competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids())))
  with check (competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids())));

-- ── pitch_room_judges ──
drop policy if exists "prj read host" on public.pitch_room_judges;
create policy "prj read host" on public.pitch_room_judges for select using (
  room_id in (
    select rm.id from public.pitch_rooms rm
    join public.pitch_rounds r on r.id = rm.round_id
    join public.pitch_competitions c on c.id = r.competition_id
    where c.host_org_id in (select public.auth_org_ids())
  )
);
drop policy if exists "prj write host managers" on public.pitch_room_judges;
create policy "prj write host managers" on public.pitch_room_judges for all
  using (room_id in (select rm.id from public.pitch_rooms rm join public.pitch_rounds r on r.id = rm.round_id join public.pitch_competitions c on c.id = r.competition_id where c.host_org_id in (select public.auth_manager_org_ids())))
  with check (room_id in (select rm.id from public.pitch_rooms rm join public.pitch_rounds r on r.id = rm.round_id join public.pitch_competitions c on c.id = r.competition_id where c.host_org_id in (select public.auth_manager_org_ids())));

-- ── pitch_rubric_criteria ──
drop policy if exists "prc read" on public.pitch_rubric_criteria;
create policy "prc read" on public.pitch_rubric_criteria for select using (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (select public.auth_org_ids())
       or c.id in (select public.auth_pitch_participant_comp_ids())
  )
);
drop policy if exists "prc write host managers" on public.pitch_rubric_criteria;
create policy "prc write host managers" on public.pitch_rubric_criteria for all
  using (competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids())))
  with check (competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids())));

-- ── pitch_competition_config ──
drop policy if exists "participants read config" on public.pitch_competition_config;
create policy "participants read config" on public.pitch_competition_config for select using (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (select public.auth_org_ids())
       or c.id in (select public.auth_pitch_participant_comp_ids())
  )
);
drop policy if exists "host managers write config" on public.pitch_competition_config;
create policy "host managers write config" on public.pitch_competition_config for all
  using (competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids())))
  with check (competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids())));

-- ── pitch_join_requests ──
drop policy if exists "org creates and reads own request" on public.pitch_join_requests;
create policy "org creates and reads own request" on public.pitch_join_requests for select using (
  org_id in (select public.auth_org_ids())
  or competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids()))
);
drop policy if exists "org inserts own request" on public.pitch_join_requests;
create policy "org inserts own request" on public.pitch_join_requests for insert with check (
  org_id in (select public.auth_org_ids())
);
drop policy if exists "host managers decide requests" on public.pitch_join_requests;
create policy "host managers decide requests" on public.pitch_join_requests for update
  using (competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids())))
  with check (competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids())));

-- ── pitch_deliverables ──
drop policy if exists "team org rw own deliverables" on public.pitch_deliverables;
create policy "team org rw own deliverables" on public.pitch_deliverables for all
  using (team_id in (select t.id from public.pitch_teams t where t.org_id in (select public.auth_org_ids())))
  with check (team_id in (select t.id from public.pitch_teams t where t.org_id in (select public.auth_org_ids())));
drop policy if exists "host managers read deliverables" on public.pitch_deliverables;
create policy "host managers read deliverables" on public.pitch_deliverables for select using (
  team_id in (select t.id from public.pitch_teams t join public.pitch_competitions c on c.id = t.competition_id where c.host_org_id in (select public.auth_manager_org_ids()))
);

-- ── pitch_scores / pitch_score_summaries ──
drop policy if exists "host managers read scores" on public.pitch_scores;
create policy "host managers read scores" on public.pitch_scores for select using (
  team_id in (select t.id from public.pitch_teams t join public.pitch_competitions c on c.id = t.competition_id where c.host_org_id in (select public.auth_manager_org_ids()))
);
drop policy if exists "host managers read summaries" on public.pitch_score_summaries;
create policy "host managers read summaries" on public.pitch_score_summaries for select using (
  team_id in (select t.id from public.pitch_teams t join public.pitch_competitions c on c.id = t.competition_id where c.host_org_id in (select public.auth_manager_org_ids()))
);

-- ── pitch_results ──
drop policy if exists "results read gated by reveal" on public.pitch_results;
create policy "results read gated by reveal" on public.pitch_results for select using (
  team_id in (select t.id from public.pitch_teams t join public.pitch_competitions c on c.id = t.competition_id where c.host_org_id in (select public.auth_manager_org_ids()))
  or team_id in (
    select t.id from public.pitch_teams t
    join public.pitch_competitions c on c.id = t.competition_id
    where t.org_id in (select public.auth_org_ids()) and c.results_visible = true
  )
);

-- ── pitch_sponsors ──
drop policy if exists "public reads sponsors of public competitions" on public.pitch_sponsors;
create policy "public reads sponsors of public competitions" on public.pitch_sponsors for select using (
  competition_id in (select id from public.pitch_competitions where is_public = true)
  or competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_org_ids()))
);
drop policy if exists "host managers write sponsors" on public.pitch_sponsors;
create policy "host managers write sponsors" on public.pitch_sponsors for all
  using (competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids())))
  with check (competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids())));

-- ── pitch_announcements ──
drop policy if exists "host or participant reads announcements" on public.pitch_announcements;
create policy "host or participant reads announcements" on public.pitch_announcements for select using (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (select public.auth_org_ids())
       or c.id in (select public.auth_pitch_participant_comp_ids())
  )
);
drop policy if exists "host managers write announcements" on public.pitch_announcements;
create policy "host managers write announcements" on public.pitch_announcements for all
  using (competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids())))
  with check (competition_id in (select id from public.pitch_competitions c where c.host_org_id in (select public.auth_manager_org_ids())));

-- ── council_fund_metrics (public reads stay using(true)) ──
drop policy if exists "org managers write fund metrics" on public.council_fund_metrics;
create policy "org managers write fund metrics" on public.council_fund_metrics for all
  using (org_id in (select public.auth_manager_org_ids()))
  with check (org_id in (select public.auth_manager_org_ids()));

-- ── org_competition_badges ──
drop policy if exists "org members read competition badges" on public.org_competition_badges;
create policy "org members read competition badges" on public.org_competition_badges for select using (
  org_member_id in (select om.id from public.org_members om where om.org_id in (select public.auth_org_ids()))
);

-- ── pitch_talent_optin / pitch_consent_audit ──
drop policy if exists "team org rw optin" on public.pitch_talent_optin;
create policy "team org rw optin" on public.pitch_talent_optin for all
  using (pitch_team_member_id in (select tm.id from public.pitch_team_members tm join public.pitch_teams t on t.id = tm.team_id where t.org_id in (select public.auth_org_ids())))
  with check (pitch_team_member_id in (select tm.id from public.pitch_team_members tm join public.pitch_teams t on t.id = tm.team_id where t.org_id in (select public.auth_org_ids())));
drop policy if exists "team org reads audit" on public.pitch_consent_audit;
create policy "team org reads audit" on public.pitch_consent_audit for select using (
  pitch_team_member_id in (select tm.id from public.pitch_team_members tm join public.pitch_teams t on t.id = tm.team_id where t.org_id in (select public.auth_org_ids()))
);
