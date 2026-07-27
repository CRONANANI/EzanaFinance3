-- =============================================================================
-- Demo-data seed: Ezana Test University Investment Council
-- =============================================================================
-- WHY: The council org's Assignments / Grades / Meetings / Recognition / Cohorts
-- / Pitch Pipeline / Research Library / Fund Analytics / Team Permissions pages
-- render empty because those tables have no rows for it — the pages are
-- DB-backed (live API routes scoped to member.org_id), not mock-file-backed.
-- The TMT seed created the org + members but none of the *activity* data.
--
-- SCOPE (hard rule): every row below is written ONLY for
--   org_id = 'a0000000-0000-0000-0000-000000000001'  (Ezana Test University).
-- Real university orgs (the 7e51... ids) are NEVER touched — the
-- honest-empty-states principle: a real McMaster/Queen's org starts empty and
-- fills with *their* real data, never inherits test rows.
--
-- SAFETY:
--   * Attaches only to REAL, FK-valid, active council members (resolved
--     dynamically). If the council has no such member, the seed no-ops.
--   * Idempotent: prior council demo rows (scoped to this org) are deleted, then
--     re-inserted — re-running does not duplicate.
--   * Data only — no schema changes, no app code.
--   * A commented TEARDOWN block at the bottom wipes all demo data cleanly.
-- =============================================================================

do $seed$
declare
  v_org      uuid := 'a0000000-0000-0000-0000-000000000001';
  v_members  int;
  v_u1 uuid;  v_m1 uuid;   -- first  council member: (auth user_id, org_members.id)
  v_u2 uuid;  v_m2 uuid;   -- second council member (falls back to the first)
  v_exec_u   uuid;         -- an executive user_id (assigned_by / awarded_by / graded_by / started_by)
  v_t_health uuid;
  v_t_tech   uuid;
  v_t_fin    uuid;
  v_cohort   uuid;
  v_asg_pitch    uuid;     -- graded pitch assignment (linked from a grade row)
  v_asg_research uuid;     -- graded research assignment (linked from a grade row)
  v_p_lly uuid;
begin
  -- ── Resolve REAL, FK-valid, active members (present in auth.users) ──────────
  select count(*) into v_members
  from public.org_members om
  where om.org_id = v_org and om.is_active
    and exists (select 1 from auth.users u where u.id = om.user_id);

  if v_members = 0 then
    raise notice 'Ezana council demo seed: no FK-valid active members — skipping (no-op). Seed populates once a real user joins the council org.';
    return;
  end if;

  select om.user_id, om.id into v_u1, v_m1
  from public.org_members om
  where om.org_id = v_org and om.is_active
    and exists (select 1 from auth.users u where u.id = om.user_id)
  order by om.joined_at asc
  limit 1;

  select om.user_id, om.id into v_u2, v_m2
  from public.org_members om
  where om.org_id = v_org and om.is_active
    and om.id <> v_m1
    and exists (select 1 from auth.users u where u.id = om.user_id)
  order by om.joined_at asc
  limit 1;

  if v_u2 is null then v_u2 := v_u1; v_m2 := v_m1; end if;

  -- Prefer an executive as the acting "staff" user for the *_by columns.
  select om.user_id into v_exec_u
  from public.org_members om
  where om.org_id = v_org and om.is_active and om.role = 'executive'
    and exists (select 1 from auth.users u where u.id = om.user_id)
  order by om.joined_at asc
  limit 1;
  if v_exec_u is null then v_exec_u := v_u1; end if;

  -- ── IDEMPOTENCY: clear any prior council demo rows (this org only) ──────────
  -- Children before parents to respect FKs. All scoped to v_org (or its teams).
  update public.org_members set cohort_id = null where org_id = v_org;
  delete from public.org_grades          where org_id = v_org;
  delete from public.org_assignments     where org_id = v_org;
  delete from public.org_fund_snapshots  where org_id = v_org;
  delete from public.org_positions       where org_id = v_org;
  delete from public.org_research_notes  where org_id = v_org;
  delete from public.org_recognition     where org_id = v_org;
  delete from public.org_meetings        where org_id = v_org;
  delete from public.org_pitches         where org_id = v_org;
  delete from public.org_team_portfolios where team_id in (select id from public.org_teams where org_id = v_org);
  delete from public.org_cohorts         where org_id = v_org;
  delete from public.org_teams           where org_id = v_org;

  -- ── Sector desks (teams) ───────────────────────────────────────────────────
  insert into public.org_teams (org_id, name, slug, description) values
    (v_org, '[DEMO] Healthcare',  'healthcare',  'Demo sector desk — healthcare, pharma & biotech coverage.')
    returning id into v_t_health;
  insert into public.org_teams (org_id, name, slug, description) values
    (v_org, '[DEMO] Technology',  'technology',  'Demo sector desk — software, semis & internet coverage.')
    returning id into v_t_tech;
  insert into public.org_teams (org_id, name, slug, description) values
    (v_org, '[DEMO] Financials',  'financials',  'Demo sector desk — banks, brokers & insurance coverage.')
    returning id into v_t_fin;

  -- ── Cohort (2026 analyst class) + attach the council members to it ─────────
  insert into public.org_cohorts (org_id, name, term_type, starts_on, ends_on, is_current, status, entry_term, expected_grad_term)
  values (v_org, '2026 Analyst Class', 'semester', date '2026-01-15', date '2026-05-15', true, 'active', 'Winter 2026', 'Spring 2028')
  returning id into v_cohort;

  update public.org_members set cohort_id = v_cohort where org_id = v_org and is_active;

  -- ── Assignments (varied types + statuses) ──────────────────────────────────
  insert into public.org_assignments
    (org_id, cohort_id, assigned_to, assigned_by, title, description, assignment_type, due_date, status, ticker, sector, progress_pct)
  values
    (v_org, v_cohort, v_u1, v_exec_u, '[DEMO] Q1 Healthcare sector pitch',
      'Present a long/short idea from the healthcare sleeve to the IC.', 'pitch',
      now() - interval '9 days', 'graded', 'LLY', 'Healthcare', 100)
    returning id into v_asg_pitch;

  insert into public.org_assignments
    (org_id, cohort_id, assigned_to, assigned_by, title, description, assignment_type, due_date, status, ticker, sector, progress_pct)
  values
    (v_org, v_cohort, v_u2, v_exec_u, '[DEMO] Rising rates & bank NIMs — research memo',
      'Two-page memo on how the rate path affects large-cap bank net interest margins.', 'research',
      now() - interval '4 days', 'graded', 'JPM', 'Financials', 100)
    returning id into v_asg_research;

  insert into public.org_assignments
    (org_id, cohort_id, assigned_to, assigned_by, title, description, assignment_type, due_date, status, ticker, sector, progress_pct)
  values
    (v_org, v_cohort, v_u1, v_exec_u, '[DEMO] AAPL coverage initiation',
      'Initiate coverage: business overview, thesis, key risks, and a valuation range.', 'coverage',
      now() + interval '5 days', 'submitted', 'AAPL', 'Technology', 80),
    (v_org, v_cohort, v_u2, v_exec_u, '[DEMO] Build a 3-statement model for MSFT',
      'Link the income statement, balance sheet and cash flow; drive off revenue segments.', 'model',
      now() + interval '10 days', 'in_progress', 'MSFT', 'Technology', 45),
    (v_org, v_cohort, v_u1, v_exec_u, '[DEMO] Read: "The Intelligent Investor" — ch. 8 & 20',
      'Mr. Market and margin of safety. Come ready to discuss in the next education session.', 'reading',
      now() + interval '7 days', 'assigned', null, null, 0),
    (v_org, v_cohort, v_u2, v_exec_u, '[DEMO] IC meeting prep — semiconductor cycle',
      'Prepare three discussion questions on the current semi cycle for the weekly IC.', 'meeting_prep',
      now() + interval '2 days', 'assigned', 'NVDA', 'Technology', 10);

  -- ── Grades (for the graded assignments + participation/overall) ────────────
  insert into public.org_grades
    (org_id, cohort_id, student_id, graded_by, work_type, work_id, score, max_score, letter, feedback, rubric)
  values
    (v_org, v_cohort, v_u1, v_exec_u, 'pitch', v_asg_pitch, 91, 100, 'A-',
      'Strong thesis and clean valuation bridge. Tighten the bear case and quantify the pipeline risk.',
      '{"thesis":28,"valuation":24,"risk":19,"delivery":20}'::jsonb),
    (v_org, v_cohort, v_u2, v_exec_u, 'research_note', v_asg_research, 84, 100, 'B',
      'Good grasp of the NIM mechanics. Add a rate-scenario table and cite the deposit-beta source.',
      '{"analysis":34,"clarity":26,"sourcing":24}'::jsonb),
    (v_org, v_cohort, v_u1, v_exec_u, 'coverage', null, 88, 100, 'B+',
      'Solid coverage initiation; comps were well chosen.',
      '{"depth":30,"comps":30,"writeup":28}'::jsonb),
    (v_org, v_cohort, v_u2, v_exec_u, 'participation', null, 95, 100, 'A',
      'Consistently prepared and engaged in IC discussions this term.', null);

  -- ── Meetings (mix of scheduled + closed, with agenda / minutes JSONB) ──────
  insert into public.org_meetings
    (org_id, title, status, category, started_by, scheduled_at, started_at, closed_at, location, team_id, agenda, minutes)
  values
    (v_org, '[DEMO] Weekly Investment Committee', 'closed', 'ic', v_exec_u,
      now() - interval '7 days', now() - interval '7 days', now() - interval '7 days' + interval '75 minutes',
      'Finance Lab 204',  null,
      '[{"label":"Portfolio review & attribution","owner":"Chair","minutes":15,"kind":"review"},
        {"label":"Pitch: LLY (Healthcare)","owner":"Analyst","minutes":20,"kind":"pitch"},
        {"label":"Vote: initiate JPM position","owner":"IC","minutes":10,"kind":"vote"},
        {"label":"Risk & concentration check","owner":"Risk","minutes":10,"kind":"update"}]'::jsonb,
      '[{"note":"LLY approved for a starter position, 3% target weight."},
        {"note":"JPM initiation passed 6-1; monitor deposit betas."},
        {"note":"Healthcare sleeve slightly over target — trim next week."}]'::jsonb),
    (v_org, '[DEMO] Q1 Performance Review', 'closed', 'general', v_exec_u,
      now() - interval '21 days', now() - interval '21 days', now() - interval '21 days' + interval '60 minutes',
      'Finance Lab 204',  null,
      '[{"label":"Fund vs. benchmark, quarter to date","owner":"Chair","minutes":20,"kind":"review"},
        {"label":"Analyst hit-rate recap","owner":"Chair","minutes":15,"kind":"update"}]'::jsonb,
      '[{"note":"Fund tracking ~2.3% ahead of benchmark QTD."},
        {"note":"Best contributor: healthcare sleeve."}]'::jsonb),
    (v_org, '[DEMO] Healthcare desk stand-up', 'scheduled', 'sector', v_exec_u,
      now() + interval '2 days', null, null, 'Zoom', v_t_health,
      '[{"label":"Coverage updates","owner":"PM","minutes":15,"kind":"update"},
        {"label":"UNH deep-dive status","owner":"Analyst","minutes":15,"kind":"discussion"}]'::jsonb,
      '[]'::jsonb),
    (v_org, '[DEMO] New-analyst onboarding & valuation workshop', 'scheduled', 'education', v_exec_u,
      now() + interval '6 days', null, null, 'Finance Lab 204', null,
      '[{"label":"DCF walkthrough","owner":"Exec","minutes":30,"kind":"discussion"},
        {"label":"Comps & trading multiples","owner":"Exec","minutes":20,"kind":"discussion"}]'::jsonb,
      '[]'::jsonb);

  -- ── Recognition / awards ───────────────────────────────────────────────────
  insert into public.org_recognition
    (org_id, recipient_id, awarded_by, badge_type, title, reason, period, is_award, auto_generated)
  values
    (v_org, v_u1, v_exec_u, 'analyst_of_month', '[DEMO] Analyst of the Month',
      'Top-graded pitch of the term (LLY) and reliable coverage.', '2026-Q1', true, false),
    (v_org, v_u2, v_exec_u, 'best_pitch', '[DEMO] Best Pitch — Q1',
      'Rigorous rates/NIM memo that shaped the JPM decision.', '2026-Q1', true, false),
    (v_org, v_u1, v_exec_u, 'rising_star', '[DEMO] Rising Star',
      'Fastest-improving analyst across the winter cohort.', '2026-Q1', false, false),
    (v_org, v_u2, v_exec_u, 'team_player', '[DEMO] Collaboration Award',
      'Consistently supported cross-desk reviews and onboarding.', '2026-Q1', false, false);

  -- ── Pitch pipeline (valid stage / status / pitch_type / horizon enums) ─────
  insert into public.org_pitches
    (org_id, team_id, ticker, company_name, pitch_type, analyst_member_id, approving_pm_member_id,
     stage, status, decision, decision_at, thesis_short, sector, conviction_level, time_horizon,
     target_price, current_price_at_submission, expected_return_pct)
  values
    (v_org, v_t_health, 'LLY', 'Eli Lilly & Co.', 'long', v_m1, v_m1,
      'in_portfolio', 'accepted', 'accepted', now() - interval '7 days',
      'Incretin franchise (GLP-1) has years of durable double-digit growth ahead of consensus.',
      'Healthcare', 4, '12m', 1050, 880, 19.3)
    returning id into v_p_lly;

  insert into public.org_pitches
    (org_id, team_id, ticker, company_name, pitch_type, analyst_member_id,
     stage, status, thesis_short, sector, conviction_level, time_horizon,
     target_price, current_price_at_submission, expected_return_pct)
  values
    (v_org, v_t_health, 'UNH', 'UnitedHealth Group', 'long', v_m2,
      'ic_vote', 'active',
      'Optum services growth de-risks the MCO cycle; MLR concerns look overdone.',
      'Healthcare', 3, '12m', 620, 505, 22.8),
    (v_org, v_t_tech, 'NVDA', 'NVIDIA Corp.', 'long', v_m1,
      'deep_dive', 'active',
      'Data-center demand + software attach widen the moat beyond the current hardware cycle.',
      'Technology', 5, '24m', 195, 128, 52.3),
    (v_org, v_t_tech, 'CRM', 'Salesforce, Inc.', 'short', v_m2,
      'screening', 'active',
      'Seat growth is decelerating while AI capex pressures margins — multiple looks full.',
      'Technology', 2, '6m', 220, 265, 17.0),
    (v_org, v_t_fin, 'JPM', 'JPMorgan Chase & Co.', 'long', v_m1,
      'approved', 'accepted',
      'Best-in-class deposit franchise compounds book value through the rate cycle.',
      'Financials', 4, '12m', 245, 205, 19.5),
    (v_org, v_t_fin, 'SCHW', 'Charles Schwab Corp.', 'long', v_m2,
      'idea', 'active',
      'Cash-sorting headwind is peaking; NIM recovers as the balance sheet re-terms.',
      'Financials', 3, '12m', 82, 66, 24.2);

  -- ── Research library ───────────────────────────────────────────────────────
  insert into public.org_research_notes
    (org_id, author_id, title, body, ticker, sector, tags, visibility, team_id, doc_type, status, abstract, pinned, term)
  values
    (v_org, v_u1, '[DEMO] Eli Lilly (LLY) — Long Thesis',
      'GLP-1 volume growth remains under-modeled by the street. Manufacturing build-out and label expansions extend the runway; base case implies ~19% upside over 12 months.',
      'LLY', 'Healthcare', array['thesis','glp-1','pharma'], 'org', v_t_health, 'thesis', 'published',
      'Long thesis on Lilly''s incretin franchise and capacity ramp.', true, 'Winter 2026'),
    (v_org, v_u2, '[DEMO] Rates & Bank NIMs — Sector Memo',
      'Walks through deposit betas, asset re-pricing and the NIM path under three rate scenarios. Concludes large-cap banks are positioned to hold margins better than consensus.',
      'JPM', 'Financials', array['memo','rates','banks'], 'org', v_t_fin, 'memo', 'published',
      'How the rate path flows through large-cap bank margins.', false, 'Winter 2026'),
    (v_org, v_u1, '[DEMO] NVDA — Deep Dive (WIP)',
      'Segments data-center revenue into training vs. inference and stress-tests the software attach rate. Draft pending a channel-check appendix.',
      'NVDA', 'Technology', array['deep-dive','semis','ai'], 'team', v_t_tech, 'report', 'draft',
      'Data-center demand decomposition and moat durability.', false, 'Winter 2026'),
    (v_org, v_u2, '[DEMO] UNH — Coverage Note',
      'Overview of the managed-care model, Optum''s contribution, and why the current MLR scare is likely transitory.',
      'UNH', 'Healthcare', array['coverage','managed-care'], 'org', v_t_health, 'note', 'published',
      'Coverage initiation summary for UnitedHealth.', false, 'Winter 2026'),
    (v_org, v_u1, '[DEMO] Semiconductor Cycle — Primer',
      'A short primer on the semi cycle: inventory dynamics, lead times and how to read the current up-leg.',
      null, 'Technology', array['primer','semis','education'], 'org', v_t_tech, 'note', 'published',
      'Educational primer on reading the semiconductor cycle.', false, 'Winter 2026');

  -- ── Fund analytics: sleeve portfolios (weights source) + snapshots (series) ─
  -- Modest model-book units — this is TEST data; no real dollar AUM is implied.
  insert into public.org_team_portfolios (team_id, ticker_symbol, shares, avg_cost, current_value, sector, added_by)
  values
    (v_t_health, 'LLY', 40, 820, 42000, 'Healthcare', v_u1),
    (v_t_health, 'UNH', 30, 480, 15600, 'Healthcare', v_u2),
    (v_t_tech,   'NVDA', 300, 118, 39900, 'Technology', v_u1),
    (v_t_tech,   'MSFT', 90, 395, 38700, 'Technology', v_u2),
    (v_t_fin,    'JPM', 120, 198, 25800, 'Financials', v_u1),
    (v_t_fin,    'SCHW', 350, 64, 24500, 'Financials', v_u2);

  -- Positions surface (separate from the fund-analytics portfolio source).
  insert into public.org_positions
    (org_id, team_id, ticker, name, shares, avg_cost, current_price, sector, source, added_by_user_id, notes, is_active)
  values
    (v_org, v_t_health, 'LLY',  'Eli Lilly & Co.',      40,  820, 1050, 'Healthcare', 'manual', v_u1, 'Starter position from Q1 pitch.', true),
    (v_org, v_t_health, 'UNH',  'UnitedHealth Group',   30,  480,  520, 'Healthcare', 'manual', v_u2, 'Pending IC vote.', true),
    (v_org, v_t_tech,   'NVDA', 'NVIDIA Corp.',        300,  118,  133, 'Technology', 'manual', v_u1, 'Core tech sleeve holding.', true),
    (v_org, v_t_tech,   'MSFT', 'Microsoft Corp.',      90,  395,  430, 'Technology', 'manual', v_u2, 'Model exercise position.', true),
    (v_org, v_t_fin,    'JPM',  'JPMorgan Chase & Co.', 120, 198,  215, 'Financials', 'manual', v_u1, 'Initiated after IC approval.', true);

  -- Monthly fund snapshots (returns / benchmark / alpha as PERCENTAGES only —
  -- total_value / total_cost left NULL so no dollar AUM is implied on the chart).
  insert into public.org_fund_snapshots
    (org_id, cohort_id, snapshot_date, total_value, total_cost, return_pct, benchmark_return_pct, alpha_pct, attribution)
  values
    (v_org, v_cohort, date '2026-02-27', null, null, 0.0, 0.0, 0.0,
      '{"by_sector":{"Healthcare":0.0,"Technology":0.0,"Financials":0.0}}'::jsonb),
    (v_org, v_cohort, date '2026-03-31', null, null, 1.9, 1.4, 0.5,
      '{"by_sector":{"Healthcare":0.9,"Technology":0.7,"Financials":0.3}}'::jsonb),
    (v_org, v_cohort, date '2026-04-30', null, null, 3.4, 2.6, 0.8,
      '{"by_sector":{"Healthcare":1.5,"Technology":1.2,"Financials":0.7}}'::jsonb),
    (v_org, v_cohort, date '2026-05-29', null, null, 4.1, 3.5, 0.6,
      '{"by_sector":{"Healthcare":1.7,"Technology":1.6,"Financials":0.8}}'::jsonb),
    (v_org, v_cohort, date '2026-06-30', null, null, 6.7, 4.9, 1.8,
      '{"by_sector":{"Healthcare":2.6,"Technology":2.9,"Financials":1.2}}'::jsonb),
    (v_org, v_cohort, date '2026-07-24', null, null, 8.4, 6.1, 2.3,
      '{"by_sector":{"Healthcare":3.1,"Technology":3.7,"Financials":1.6}}'::jsonb);

  raise notice 'Ezana council demo seed applied for org % (members resolved: %).', v_org, v_members;
end
$seed$;

-- =============================================================================
-- TEARDOWN — uncomment and run to remove ALL council demo data before a real
-- launch/demo. Scoped strictly to the test council org; touches nothing else.
-- =============================================================================
-- do $teardown$
-- declare v_org uuid := 'a0000000-0000-0000-0000-000000000001';
-- begin
--   update public.org_members set cohort_id = null where org_id = v_org;
--   delete from public.org_grades          where org_id = v_org;
--   delete from public.org_assignments     where org_id = v_org;
--   delete from public.org_fund_snapshots  where org_id = v_org;
--   delete from public.org_positions       where org_id = v_org;
--   delete from public.org_research_notes  where org_id = v_org;
--   delete from public.org_recognition     where org_id = v_org;
--   delete from public.org_meetings        where org_id = v_org;
--   delete from public.org_pitches         where org_id = v_org;
--   delete from public.org_team_portfolios where team_id in (select id from public.org_teams where org_id = v_org);
--   delete from public.org_cohorts         where org_id = v_org;
--   delete from public.org_teams           where org_id = v_org;
-- end
-- $teardown$;
