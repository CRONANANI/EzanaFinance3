-- ============================================================================
-- Demo/seed data — "Ezana Test University" investment council.
-- Safe to delete; see the teardown block at the bottom.
--
-- Populates an EXISTING org (the presenter logs into it) so all six redesigned
-- org pages render FULL:
--   Org Chart · Pitch Pipeline · Research Library · Meetings · Recognition · Cohorts
-- The app reads these rows through its existing real queries. ZERO app-code changes.
--
-- ⚠ THIS ORG IS SHARED WITH REAL TEST DATA. The seed is ADDITIVE and NON-
--   DESTRUCTIVE. It only UPSERTs (by id) the organizations row, the "Fall 2026"
--   cohort, and the 4 pre-existing members — and even then it never changes their
--   protected fields (org.name; a member's user_id / role / display_name). Every
--   other row is brand-new and carries a structured "seed namespace" UUID so the
--   teardown can remove EXACTLY the seeded rows and nothing pre-existing.
--
-- HOW TO RUN
--   • Supabase SQL editor: paste this whole file and Run.
--   • psql:  psql "$SUPABASE_DB_URL" -f supabase/seed-demo-org.sql
-- Run against STAGING first, confirm all six pages fill, then prod.
--
-- IDEMPOTENT: fixed/deterministic UUIDs + ON CONFLICT on every INSERT. Safe to
-- run repeatedly (second run is a clean no-op). Wrapped in one transaction.
--
-- ── TARGET / REUSED IDS ─────────────────────────────────────────────────────
--   DEMO_ORG_ID = 84c0372a-6b0a-4126-963e-9b0aa6660570   (existing "Ezana Test University")
--   Reused teams (existing — NOT re-created):
--     TMT   7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9   HC   c16275b2-42eb-410a-89d7-758788c08fdc
--     FIN   73da53d7-676b-419a-a20b-f1a728c92fe7   CON  c8880eae-61a7-441e-849c-11624cb6be49
--     ENE   76a5af44-191c-422b-b428-17803eb799bd   IND  56e26029-5600-42f4-9464-ab3728f14177
--     MET   0ab6e817-2dc8-4bcd-8b73-70573ca68aac   EXE  5d5e0da7-0c69-47ba-ab1f-303df8ac0385
--   Reused cohort:  Fall 2026 = 9e1f95d9-5978-442a-abdd-588482f94575 (active)
--   Reused members (UPSERTed into hierarchy; protected fields preserved):
--     Noah Raymond-Leigh e8e3758f-9a71-4efb-9532-228ae257d09e (exec, president)  ← top of chart
--     Master Test Admin  1ff8ab9a-1c40-4b38-9812-e28ce7a151a3 (exec)
--     Noah Asheber       e09e4c06-dd92-4190-82b6-bb75b0f8c3be (PM, TMT desk head) ← PRESENTER
--     Blackberry Analyst fc2ca48d-c5c4-4713-a156-4c43d0394175 (analyst, TMT)
--
-- ── SEED-NAMESPACE UUID PREFIXES (every new row; teardown deletes by these) ──
--   auth.users             d0000000-0000-4000-a000-0000000000NN  (NN 05..34)
--   org_members (new)      d1000000-0000-4000-a000-0000000000NN  (05..19 active · 20..34 alumni)
--   org_cohorts (new)      d3000000-0000-4000-a000-0000000020YY  (2027 recruiting · 2025 alumni)
--   org_pitches            d4000000-…   votes d4a00000  deliverables d4b00000
--                          stage_history d4c00000  discussion d4d00000  (hindsight keyed by pitch_id)
--   org_research_notes     d5000000-…   versions d5a00000  comments d5b00000
--                          templates d5c00000  collections d5d00000  coverage_lineage d5e00000
--   org_meetings           d6000000-…   attendees d6a00000  sentiment d6b00000
--                          deliverables d6c00000  votes d6d00000   org_ic_meetings d6f00000
--   org_assignments        d7000000-…   assignees d7a00000  submissions d7b00000
--                          comments d7c00000  templates d7d00000  onboarding_tasks d7e00000
--   org_applicants         d8000000-…   applicant_scores d8a00000  application_forms d8b00000
--   org_alumni_records     d9000000-…
--   org_fund_snapshots     da000000-…
--   org_member_rating      db000000-…   rating_transactions dba00000  rating_categories dbb00000
--   org_recognition        dc000000-…
--
-- NOTE: org_members.user_id and the assignment/research/recognition authorship
-- columns carry a VALIDATED FK to auth.users on this DB, so the seed creates
-- minimal demo auth.users rows (only id is required). It never touches real
-- accounts. Recorder integrations are intentionally left EMPTY; research
-- embeddings are left NULL (semantic search honestly degrades to keyword).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. ORG — upsert; keep name; only fill fund_display_name if currently null.
-- ============================================================================
INSERT INTO public.organizations
  (id, name, slug, university_name, email_domain, fund_display_name)
VALUES
  ('84c0372a-6b0a-4126-963e-9b0aa6660570','Ezana Test University','ezana-test',
   'Ezana Test University','gmail.com','Ezana Test University Investment Council')
ON CONFLICT (id) DO UPDATE SET
   fund_display_name = COALESCE(public.organizations.fund_display_name, EXCLUDED.fund_display_name);

-- ============================================================================
-- 1. auth.users — minimal demo accounts for NEW seeded people (NN 05..34).
--    (Existing members keep their real auth.users rows — untouched.)
-- ============================================================================
INSERT INTO auth.users (instance_id, id, aud, role, email, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000000'::uuid,
       ('d0000000-0000-4000-a000-0000000000' || lpad(n::text,2,'0'))::uuid,
       'authenticated','authenticated',
       'demo-user-' || lpad(n::text,2,'0') || '@ezanatest.edu',
       now() - interval '400 days', now()
FROM generate_series(5,50) AS n
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. COHORTS — upsert reused "Fall 2026"; add recruiting + alumni classes.
-- ============================================================================
INSERT INTO public.org_cohorts
  (id, org_id, name, term_type, starts_on, ends_on, is_current, archived, status, entry_term, expected_grad_term, onboarding_gate)
VALUES
  ('9e1f95d9-5978-442a-abdd-588482f94575','84c0372a-6b0a-4126-963e-9b0aa6660570','Fall 2026','semester','2024-09-01','2026-05-15', true, false,'active','Fall 2024','Spring 2026', true)
ON CONFLICT (id) DO UPDATE SET
   status='active', entry_term=EXCLUDED.entry_term, expected_grad_term=EXCLUDED.expected_grad_term;

INSERT INTO public.org_cohorts
  (id, org_id, name, term_type, starts_on, ends_on, is_current, archived, status, entry_term, expected_grad_term, onboarding_gate)
VALUES
  ('d3000000-0000-4000-a000-000000002027','84c0372a-6b0a-4126-963e-9b0aa6660570','Class of 2027','semester','2025-09-01','2027-05-15', false, false,'recruiting','Fall 2025','Spring 2027', true),
  ('d3000000-0000-4000-a000-000000002025','84c0372a-6b0a-4126-963e-9b0aa6660570','Class of 2025','semester','2023-09-01','2025-05-15', false, true, 'alumni','Fall 2023','Spring 2025', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3a. MEMBERS — UPSERT the 4 existing (only non-protected fields; never touch
--     user_id / role / display_name).
-- ============================================================================
INSERT INTO public.org_members (id, user_id, org_id, role, display_name, team_id, tier, title, reports_to, cohort_id, lifecycle_status)
VALUES
 ('e8e3758f-9a71-4efb-9532-228ae257d09e','e9a6277b-7cc2-4395-b85b-6de8ddbada83','84c0372a-6b0a-4126-963e-9b0aa6660570','executive','Noah Raymond-Leigh','5d5e0da7-0c69-47ba-ab1f-303df8ac0385','president','President & CIO',NULL,'9e1f95d9-5978-442a-abdd-588482f94575','active'),
 ('1ff8ab9a-1c40-4b38-9812-e28ce7a151a3','72a333c0-bf84-432c-be9f-fad56670dd13','84c0372a-6b0a-4126-963e-9b0aa6660570','executive','Master Test Admin','5d5e0da7-0c69-47ba-ab1f-303df8ac0385','vice_president','Vice President','e8e3758f-9a71-4efb-9532-228ae257d09e','9e1f95d9-5978-442a-abdd-588482f94575','active'),
 ('e09e4c06-dd92-4190-82b6-bb75b0f8c3be','b0a9a9d4-54a2-4461-a203-95d869dae6c1','84c0372a-6b0a-4126-963e-9b0aa6660570','portfolio_manager','Noah Asheber','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','senior_portfolio_manager','TMT Portfolio Manager','e8e3758f-9a71-4efb-9532-228ae257d09e','9e1f95d9-5978-442a-abdd-588482f94575','active'),
 ('fc2ca48d-c5c4-4713-a156-4c43d0394175','c45adbae-9cce-4508-9a1e-62a78efdc4b5','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','Blackberry Analyst','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','analyst','Analyst — TMT','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','9e1f95d9-5978-442a-abdd-588482f94575','active')
ON CONFLICT (id) DO UPDATE SET
   team_id=EXCLUDED.team_id, tier=EXCLUDED.tier, title=EXCLUDED.title,
   reports_to=EXCLUDED.reports_to, cohort_id=EXCLUDED.cohort_id, lifecycle_status=EXCLUDED.lifecycle_status;

-- ============================================================================
-- 3b. MEMBERS — 15 NEW active members (fills the 8 desks + hierarchy).
-- ============================================================================
INSERT INTO public.org_members
  (id, user_id, org_id, role, tier, title, team_id, display_name, is_active,
   reports_to, cohort_id, lifecycle_status, mentor_member_id, term_start, is_graduating, joined_at) VALUES
 ('d1000000-0000-4000-a000-000000000005','d0000000-0000-4000-a000-000000000005','84c0372a-6b0a-4126-963e-9b0aa6660570','portfolio_manager','senior_portfolio_manager','Healthcare PM','c16275b2-42eb-410a-89d7-758788c08fdc','Aisha Patel',true,'e8e3758f-9a71-4efb-9532-228ae257d09e','9e1f95d9-5978-442a-abdd-588482f94575','graduating',NULL,'2024-09-01',true, now()-interval '600 days'),
 ('d1000000-0000-4000-a000-000000000006','d0000000-0000-4000-a000-000000000006','84c0372a-6b0a-4126-963e-9b0aa6660570','portfolio_manager','senior_portfolio_manager','Financials PM','73da53d7-676b-419a-a20b-f1a728c92fe7','David Okonkwo',true,'e8e3758f-9a71-4efb-9532-228ae257d09e','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2024-09-01',false, now()-interval '600 days'),
 ('d1000000-0000-4000-a000-000000000007','d0000000-0000-4000-a000-000000000007','84c0372a-6b0a-4126-963e-9b0aa6660570','portfolio_manager','senior_portfolio_manager','Consumer PM','c8880eae-61a7-441e-849c-11624cb6be49','Sofia Ramirez',true,'e8e3758f-9a71-4efb-9532-228ae257d09e','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2024-09-01',false, now()-interval '590 days'),
 ('d1000000-0000-4000-a000-000000000008','d0000000-0000-4000-a000-000000000008','84c0372a-6b0a-4126-963e-9b0aa6660570','portfolio_manager','senior_portfolio_manager','Energy PM','76a5af44-191c-422b-b428-17803eb799bd','Priya Nair',true,'e8e3758f-9a71-4efb-9532-228ae257d09e','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2024-09-01',false, now()-interval '585 days'),
 ('d1000000-0000-4000-a000-000000000009','d0000000-0000-4000-a000-000000000009','84c0372a-6b0a-4126-963e-9b0aa6660570','portfolio_manager','senior_portfolio_manager','Industrials PM','56e26029-5600-42f4-9464-ab3728f14177','Ethan Kim',true,'e8e3758f-9a71-4efb-9532-228ae257d09e','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2024-09-01',false, now()-interval '580 days'),
 ('d1000000-0000-4000-a000-000000000010','d0000000-0000-4000-a000-000000000010','84c0372a-6b0a-4126-963e-9b0aa6660570','portfolio_manager','senior_portfolio_manager','Metals & Mining PM','0ab6e817-2dc8-4bcd-8b73-70573ca68aac','Hannah Weiss',true,'e8e3758f-9a71-4efb-9532-228ae257d09e','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2024-09-01',false, now()-interval '575 days'),
 ('d1000000-0000-4000-a000-000000000011','d0000000-0000-4000-a000-000000000011','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','senior_analyst','Senior Analyst — TMT','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','Jordan Blake',true,'e09e4c06-dd92-4190-82b6-bb75b0f8c3be','9e1f95d9-5978-442a-abdd-588482f94575','graduating',NULL,'2024-09-01',true, now()-interval '560 days'),
 ('d1000000-0000-4000-a000-000000000012','d0000000-0000-4000-a000-000000000012','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','senior_analyst','Senior Analyst — Healthcare','c16275b2-42eb-410a-89d7-758788c08fdc','Mei Lin',true,'d1000000-0000-4000-a000-000000000005','9e1f95d9-5978-442a-abdd-588482f94575','graduating',NULL,'2024-09-01',true, now()-interval '555 days'),
 ('d1000000-0000-4000-a000-000000000013','d0000000-0000-4000-a000-000000000013','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','senior_analyst','Senior Analyst — Financials','73da53d7-676b-419a-a20b-f1a728c92fe7','Carlos Mendes',true,'d1000000-0000-4000-a000-000000000006','d3000000-0000-4000-a000-000000002027','active',NULL,'2025-09-01',false, now()-interval '300 days'),
 ('d1000000-0000-4000-a000-000000000014','d0000000-0000-4000-a000-000000000014','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','senior_analyst','Senior Analyst — Energy','76a5af44-191c-422b-b428-17803eb799bd','Fatima Al-Sayed',true,'d1000000-0000-4000-a000-000000000008','d3000000-0000-4000-a000-000000002027','active',NULL,'2025-09-01',false, now()-interval '300 days'),
 ('d1000000-0000-4000-a000-000000000015','d0000000-0000-4000-a000-000000000015','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','analyst','Analyst — Healthcare','c16275b2-42eb-410a-89d7-758788c08fdc','Grace Park',true,'d1000000-0000-4000-a000-000000000012','d3000000-0000-4000-a000-000000002027','active','d1000000-0000-4000-a000-000000000012','2025-09-01',false, now()-interval '300 days'),
 ('d1000000-0000-4000-a000-000000000016','d0000000-0000-4000-a000-000000000016','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','analyst','Analyst — Consumer','c8880eae-61a7-441e-849c-11624cb6be49','Omar Haddad',true,'d1000000-0000-4000-a000-000000000007','d3000000-0000-4000-a000-000000002027','active','d1000000-0000-4000-a000-000000000007','2025-09-01',false, now()-interval '295 days'),
 ('d1000000-0000-4000-a000-000000000017','d0000000-0000-4000-a000-000000000017','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','analyst','Analyst — Industrials','56e26029-5600-42f4-9464-ab3728f14177','Ravi Shah',true,'d1000000-0000-4000-a000-000000000009','d3000000-0000-4000-a000-000000002027','active','d1000000-0000-4000-a000-000000000009','2025-09-01',false, now()-interval '295 days'),
 ('d1000000-0000-4000-a000-000000000018','d0000000-0000-4000-a000-000000000018','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','analyst','Trainee Analyst — TMT','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','Chloe Anderson',true,'d1000000-0000-4000-a000-000000000011','d3000000-0000-4000-a000-000000002027','onboarding','d1000000-0000-4000-a000-000000000011','2026-01-15',false, now()-interval '30 days'),
 ('d1000000-0000-4000-a000-000000000019','d0000000-0000-4000-a000-000000000019','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','analyst','Trainee Analyst — Metals & Mining','0ab6e817-2dc8-4bcd-8b73-70573ca68aac','Noah Bergstrom',true,'d1000000-0000-4000-a000-000000000010','d3000000-0000-4000-a000-000000002027','onboarding','d1000000-0000-4000-a000-000000000010','2026-01-15',false, now()-interval '28 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3b-2. MEMBERS — 16 NEW active members → brings the active roster to 35.
--   Tier mapping (prompt tiers → valid `tier` enum values):
--     senior_pm → senior_portfolio_manager · junior_pm → portfolio_manager
--     junior_analyst → analyst · quant_researcher → analyst (title 'Quant Researcher')
--   user_id FK: backing auth.users rows are seeded above (generate_series 5..50).
-- ============================================================================
INSERT INTO public.org_members
  (id, user_id, org_id, role, tier, title, team_id, display_name, is_active,
   reports_to, cohort_id, lifecycle_status, mentor_member_id, term_start, is_graduating, joined_at) VALUES
 -- Vice Presidents (2 new → 3 total with the existing VP)
 ('d1000000-0000-4000-a000-000000000035','d0000000-0000-4000-a000-000000000035','84c0372a-6b0a-4126-963e-9b0aa6660570','executive','vice_president','VP Research','5d5e0da7-0c69-47ba-ab1f-303df8ac0385','Diane Whitfield',true,'e8e3758f-9a71-4efb-9532-228ae257d09e','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2024-09-01',false, now()-interval '620 days'),
 ('d1000000-0000-4000-a000-000000000036','d0000000-0000-4000-a000-000000000036','84c0372a-6b0a-4126-963e-9b0aa6660570','executive','vice_president','VP Portfolio','5d5e0da7-0c69-47ba-ab1f-303df8ac0385','Marcus Ellison',true,'e8e3758f-9a71-4efb-9532-228ae257d09e','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2024-09-01',false, now()-interval '615 days'),
 -- Junior Portfolio Managers (5, on the larger desks → report to the desk head)
 ('d1000000-0000-4000-a000-000000000037','d0000000-0000-4000-a000-000000000037','84c0372a-6b0a-4126-963e-9b0aa6660570','portfolio_manager','portfolio_manager','Junior PM — TMT','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','Yuki Tanaka',true,'e09e4c06-dd92-4190-82b6-bb75b0f8c3be','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2025-09-01',false, now()-interval '300 days'),
 ('d1000000-0000-4000-a000-000000000038','d0000000-0000-4000-a000-000000000038','84c0372a-6b0a-4126-963e-9b0aa6660570','portfolio_manager','portfolio_manager','Junior PM — Healthcare','c16275b2-42eb-410a-89d7-758788c08fdc','Leila Haddad',true,'d1000000-0000-4000-a000-000000000005','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2025-09-01',false, now()-interval '295 days'),
 ('d1000000-0000-4000-a000-000000000039','d0000000-0000-4000-a000-000000000039','84c0372a-6b0a-4126-963e-9b0aa6660570','portfolio_manager','portfolio_manager','Junior PM — Financials','73da53d7-676b-419a-a20b-f1a728c92fe7','Tomás Rivera',true,'d1000000-0000-4000-a000-000000000006','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2025-09-01',false, now()-interval '290 days'),
 ('d1000000-0000-4000-a000-000000000040','d0000000-0000-4000-a000-000000000040','84c0372a-6b0a-4126-963e-9b0aa6660570','portfolio_manager','portfolio_manager','Junior PM — Consumer','c8880eae-61a7-441e-849c-11624cb6be49','Nina Kovač',true,'d1000000-0000-4000-a000-000000000007','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2025-09-01',false, now()-interval '285 days'),
 ('d1000000-0000-4000-a000-000000000041','d0000000-0000-4000-a000-000000000041','84c0372a-6b0a-4126-963e-9b0aa6660570','portfolio_manager','portfolio_manager','Junior PM — Energy','76a5af44-191c-422b-b428-17803eb799bd','Samuel Adeyemi',true,'d1000000-0000-4000-a000-000000000008','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2025-09-01',false, now()-interval '280 days'),
 -- Senior Analysts (4 new → 8 total)
 ('d1000000-0000-4000-a000-000000000042','d0000000-0000-4000-a000-000000000042','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','senior_analyst','Senior Analyst — Consumer','c8880eae-61a7-441e-849c-11624cb6be49','Priyanka Rao',true,'d1000000-0000-4000-a000-000000000007','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2025-09-01',false, now()-interval '270 days'),
 ('d1000000-0000-4000-a000-000000000043','d0000000-0000-4000-a000-000000000043','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','senior_analyst','Senior Analyst — Industrials','56e26029-5600-42f4-9464-ab3728f14177','Daniel Novak',true,'d1000000-0000-4000-a000-000000000009','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2025-09-01',false, now()-interval '265 days'),
 ('d1000000-0000-4000-a000-000000000044','d0000000-0000-4000-a000-000000000044','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','senior_analyst','Senior Analyst — Metals & Mining','0ab6e817-2dc8-4bcd-8b73-70573ca68aac','Zainab Farah',true,'d1000000-0000-4000-a000-000000000010','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2025-09-01',false, now()-interval '260 days'),
 ('d1000000-0000-4000-a000-000000000045','d0000000-0000-4000-a000-000000000045','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','senior_analyst','Senior Analyst — TMT','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','Kevin O''Brien',true,'e09e4c06-dd92-4190-82b6-bb75b0f8c3be','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2025-09-01',false, now()-interval '255 days'),
 -- Junior Analysts (2 new → 8 analyst-tier total)
 ('d1000000-0000-4000-a000-000000000046','d0000000-0000-4000-a000-000000000046','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','analyst','Analyst — Energy','76a5af44-191c-422b-b428-17803eb799bd','Elena Petrova',true,'d1000000-0000-4000-a000-000000000014','9e1f95d9-5978-442a-abdd-588482f94575','active','d1000000-0000-4000-a000-000000000014','2026-01-15',false, now()-interval '120 days'),
 ('d1000000-0000-4000-a000-000000000047','d0000000-0000-4000-a000-000000000047','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','analyst','Analyst — Financials','73da53d7-676b-419a-a20b-f1a728c92fe7','Wei Zhang',true,'d1000000-0000-4000-a000-000000000013','9e1f95d9-5978-442a-abdd-588482f94575','active','d1000000-0000-4000-a000-000000000013','2026-01-15',false, now()-interval '110 days'),
 -- Quant Researchers (3, cross-desk → report to VP Research; on the leadership team)
 ('d1000000-0000-4000-a000-000000000048','d0000000-0000-4000-a000-000000000048','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','analyst','Quant Researcher','5d5e0da7-0c69-47ba-ab1f-303df8ac0385','Anaya Sharma',true,'d1000000-0000-4000-a000-000000000035','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2025-09-01',false, now()-interval '240 days'),
 ('d1000000-0000-4000-a000-000000000049','d0000000-0000-4000-a000-000000000049','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','analyst','Quant Researcher','5d5e0da7-0c69-47ba-ab1f-303df8ac0385','Lucas Meyer',true,'d1000000-0000-4000-a000-000000000035','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2025-09-01',false, now()-interval '235 days'),
 ('d1000000-0000-4000-a000-000000000050','d0000000-0000-4000-a000-000000000050','84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','analyst','Quant Researcher','5d5e0da7-0c69-47ba-ab1f-303df8ac0385','Ibrahim Diallo',true,'d1000000-0000-4000-a000-000000000035','9e1f95d9-5978-442a-abdd-588482f94575','active',NULL,'2025-09-01',false, now()-interval '230 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3c. MEMBERS — 15 alumni (is_active=false → off the live chart; resolve names
--     & frozen ratings on Cohorts→Alumni). Cohort = Class of 2025.
-- ============================================================================
INSERT INTO public.org_members
  (id, user_id, org_id, role, tier, title, team_id, display_name, is_active,
   reports_to, cohort_id, lifecycle_status, departed_at, term_start, joined_at)
SELECT
  ('d1000000-0000-4000-a000-0000000000' || lpad(n::text,2,'0'))::uuid,
  ('d0000000-0000-4000-a000-0000000000' || lpad(n::text,2,'0'))::uuid,
  '84c0372a-6b0a-4126-963e-9b0aa6660570','analyst','senior_analyst','Alumnus',
  (ARRAY['7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','c16275b2-42eb-410a-89d7-758788c08fdc',
         '73da53d7-676b-419a-a20b-f1a728c92fe7','c8880eae-61a7-441e-849c-11624cb6be49',
         '76a5af44-191c-422b-b428-17803eb799bd','56e26029-5600-42f4-9464-ab3728f14177',
         '0ab6e817-2dc8-4bcd-8b73-70573ca68aac'])[1 + ((n-20) % 7)]::uuid,
  (ARRAY['Grace Okafor','Daniel Wu','Sofia Ricci','Aiden Clarke','Nia Robinson',
         'Leo Martins','Zara Ahmed','Owen Fischer','Maya Gupta','Elias Novak',
         'Ruby Chen','Felix Hoffmann','Amara Diallo','Jonah Reed','Talia Cohen'])[n-19],
  false, NULL, 'd3000000-0000-4000-a000-000000002025','alumni',
  now()-interval '430 days','2023-09-01', now()-interval '1000 days'
FROM generate_series(20,34) AS n
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. IC MEETING (pitch pipeline) — the Pitch-Scheduled pitches assemble here.
-- ============================================================================
INSERT INTO public.org_ic_meetings (id, org_id, meets_at, ballot_type, threshold, quorum_pct, status, created_by, created_at) VALUES
 ('d6f00000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570', now()+interval '5 days','blind','supermajority',60,'scheduled','e9a6277b-7cc2-4395-b85b-6de8ddbada83', now()-interval '3 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. PITCHES — 23 across every stage + archive lane (rejected/exited w/ reasons).
--    stage_entered_at is varied so P03/P05/P07/P10 are >30d in stage (aging amber).
--    Existing members (Noah Asheber, Blackberry Analyst) own several so the
--    presenter's login shows owned deals. Tickers avoid the 3 pre-existing ones.
-- ============================================================================
INSERT INTO public.org_pitches
 (id, org_id, team_id, ticker, company_name, pitch_type, analyst_member_id, approving_pm_member_id,
  stage, status, thesis_short, thesis_full, why_now, variant_perception, catalysts, risks,
  target_price, current_price_at_submission, pitch_price, expected_return_pct, time_horizon, sector,
  conviction_level, position_size_pct, valuation_method, valuation_bull, valuation_base, valuation_bear,
  stage_entered_at, catalyst_date, decision, decision_at, decision_rationale, archive_reason, archived_at,
  ic_meeting_id, ic_meeting_at, monitor_member_id, last_reaffirmed_at, created_at) VALUES
 -- ── idea ──
 ('d4000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','AMD','Advanced Micro Devices','long','fc2ca48d-c5c4-4713-a156-4c43d0394175',NULL,'idea','active','MI300 ramps into an AI-accelerator duopoly','AMD is the credible #2 accelerator; datacenter GPU TAM expands faster than street models.','Hyperscaler capex guides keep rising while AMD supply unlocks.','Street treats AMD as a CPU story and under-models GPU attach.','["MI300 volume ramp","Datacenter GPU share gains"]'::jsonb,'["Nvidia software moat","Supply/HBM constraints"]'::jsonb,205,168,168,22,'12m','TMT',4,3.0,'comps',240,205,150, now()-interval '5 days', now()+interval '60 days',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'fc2ca48d-c5c4-4713-a156-4c43d0394175',NULL, now()-interval '5 days'),
 ('d4000000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','PLTR','Palantir','long','d1000000-0000-4000-a000-000000000018',NULL,'idea','active','AIP lands-and-expands past the hype','Commercial AIP bootcamps convert to seat expansion faster than skeptics assume.','US commercial revenue re-accelerating each print.','Bears anchor on valuation, miss net-dollar retention inflection.','["US commercial adds","Gov budget thaw"]'::jsonb,'["Valuation reset risk","Stock-comp dilution"]'::jsonb,32,24,24,33,'24m','TMT',3,1.5,'dcf',40,32,18, now()-interval '12 days', now()+interval '75 days',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'d1000000-0000-4000-a000-000000000018',NULL, now()-interval '12 days'),
 ('d4000000-0000-4000-a000-000000000003','84c0372a-6b0a-4126-963e-9b0aa6660570','c16275b2-42eb-410a-89d7-758788c08fdc','CRSP','CRISPR Therapeutics','long','d1000000-0000-4000-a000-000000000015',NULL,'idea','active','Casgevy launch de-risks the platform','First approved CRISPR therapy; commercial proof lowers platform risk discount.','Center activations accelerating post-approval.','Market prices Casgevy as a one-off, ignores pipeline optionality.','["Patient starts ramp","Pipeline readouts"]'::jsonb,'["Slow cell-therapy uptake","Cash burn"]'::jsonb,78,52,52,50,'long-term','Healthcare',2,1.0,'sotp',110,78,40, now()-interval '42 days', now()+interval '120 days',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'d1000000-0000-4000-a000-000000000015',NULL, now()-interval '42 days'),
 -- ── research_approved ──
 ('d4000000-0000-4000-a000-000000000004','84c0372a-6b0a-4126-963e-9b0aa6660570','76a5af44-191c-422b-b428-17803eb799bd','FSLR','First Solar','long','d1000000-0000-4000-a000-000000000014','d1000000-0000-4000-a000-000000000008','research_approved','active','IRA-backed backlog is under-appreciated','Sold-out through 2026 with domestic-content premium pricing.','45X credits flowing; new capacity fully booked.','Street discounts credit monetization and pricing durability.','["Capacity ramp","ITC/45X clarity"]'::jsonb,'["Policy reversal","Module oversupply"]'::jsonb,265,192,192,38,'12m','Energy',4,2.5,'dcf',310,265,180, now()-interval '8 days', now()+interval '90 days',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'d1000000-0000-4000-a000-000000000014',NULL, now()-interval '20 days'),
 ('d4000000-0000-4000-a000-000000000005','84c0372a-6b0a-4126-963e-9b0aa6660570','c8880eae-61a7-441e-849c-11624cb6be49','CMG','Chipotle','long','d1000000-0000-4000-a000-000000000016','d1000000-0000-4000-a000-000000000007','research_approved','active','Throughput + unit growth compounding','Digital and Chipotlanes lift AUVs while unit count runway is long.','New-store productivity at record highs.','Bears fixate on multiple, miss unit-economics durability.','["Unit openings","Menu price power"]'::jsonb,'["Labor inflation","Traffic sensitivity"]'::jsonb,3600,2850,2850,26,'12m','Consumer',3,2.0,'comps',4100,3600,2500, now()-interval '36 days', now()+interval '80 days',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'d1000000-0000-4000-a000-000000000016',NULL, now()-interval '50 days'),
 -- ── research_in_progress ──
 ('d4000000-0000-4000-a000-000000000006','84c0372a-6b0a-4126-963e-9b0aa6660570','c16275b2-42eb-410a-89d7-758788c08fdc','ISRG','Intuitive Surgical','long','d1000000-0000-4000-a000-000000000012','d1000000-0000-4000-a000-000000000005','research_in_progress','active','da Vinci 5 restarts the upgrade cycle','Installed-base upgrade + procedure growth compounds recurring revenue.','dV5 launch pulling forward system demand.','Consensus under-models procedure mix and dV5 pricing.','["dV5 rollout","Procedure growth"]'::jsonb,'["Hospital capex cycles","Competition (MDT)"]'::jsonb,470,380,380,24,'24m','Healthcare',4,2.5,'dcf',540,470,330, now()-interval '20 days', now()+interval '65 days',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'d1000000-0000-4000-a000-000000000012',NULL, now()-interval '30 days'),
 ('d4000000-0000-4000-a000-000000000007','84c0372a-6b0a-4126-963e-9b0aa6660570','73da53d7-676b-419a-a20b-f1a728c92fe7','GS','Goldman Sachs','long','d1000000-0000-4000-a000-000000000013','d1000000-0000-4000-a000-000000000006','research_in_progress','active','Capital-markets rebound + buyback yield','Trough IB wallet recovers; excess capital returns compound BVPS.','Backlog rebuilding as issuance windows reopen.','Market extrapolates trough investment-banking fees.','["IB backlog","Buyback pace"]'::jsonb,'["Credit cycle","Trading volatility"]'::jsonb,520,415,415,25,'12m','Financials',3,2.0,'comps',600,520,380, now()-interval '47 days', now()+interval '40 days',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'d1000000-0000-4000-a000-000000000013',NULL, now()-interval '55 days'),
 ('d4000000-0000-4000-a000-000000000008','84c0372a-6b0a-4126-963e-9b0aa6660570','56e26029-5600-42f4-9464-ab3728f14177','DE','Deere & Co','long','d1000000-0000-4000-a000-000000000017','d1000000-0000-4000-a000-000000000009','research_in_progress','active','Precision-ag attach lifts through-cycle margins','Tech stack (See & Spray, autonomy) raises structural margin floor.','Downcycle priced in; recurring software optionality free.','Street treats DE as pure cyclical, ignores software attach.','["Precision adoption","Replacement cycle"]'::jsonb,'["Farm income downcycle","Used-equipment glut"]'::jsonb,460,375,375,23,'24m','Industrials',3,2.0,'dcf',520,460,330, now()-interval '10 days', now()+interval '95 days',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'d1000000-0000-4000-a000-000000000017',NULL, now()-interval '18 days'),
 -- ── pm_review ──
 ('d4000000-0000-4000-a000-000000000009','84c0372a-6b0a-4126-963e-9b0aa6660570','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','CRM','Salesforce','long','d1000000-0000-4000-a000-000000000011','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','pm_review','active','Margin inflection + Data Cloud upsell','Cost discipline plus Data Cloud/AI attach re-rates the FCF story.','Operating margin guide keeps stepping up.','Bears see mature seat growth, miss FCF-per-share compounding.','["Data Cloud attach","Margin guide raises"]'::jsonb,'["Seat saturation","M&A missteps"]'::jsonb,340,268,268,27,'12m','TMT',4,3.0,'dcf',390,340,240, now()-interval '6 days', now()+interval '45 days',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'d1000000-0000-4000-a000-000000000011',NULL, now()-interval '25 days'),
 ('d4000000-0000-4000-a000-000000000010','84c0372a-6b0a-4126-963e-9b0aa6660570','c8880eae-61a7-441e-849c-11624cb6be49','NKE','Nike','short','d1000000-0000-4000-a000-000000000016','d1000000-0000-4000-a000-000000000007','pm_review','active','Brand heat fading; wholesale reset drags','DTC over-rotation and innovation gap pressure gross margin and revenue.','Franchise fatigue showing in promotions and channel checks.','Consensus trusts a fast brand turnaround; we see a longer reset.','["Margin compression","Share loss to newcomers"]'::jsonb,'["Brand re-acceleration","China rebound"]'::jsonb,72,95,95,-24,'12m','Consumer',2,1.5,'comps',60,72,105, now()-interval '34 days', now()+interval '50 days',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'d1000000-0000-4000-a000-000000000016',NULL, now()-interval '44 days'),
 -- ── committee_scheduled (linked to the IC meeting) ──
 ('d4000000-0000-4000-a000-000000000011','84c0372a-6b0a-4126-963e-9b0aa6660570','c16275b2-42eb-410a-89d7-758788c08fdc','LLY','Eli Lilly','long','d1000000-0000-4000-a000-000000000012','d1000000-0000-4000-a000-000000000005','committee_scheduled','active','Incretin franchise still supply-gated','Zepbound/Mounjaro demand outstrips capacity; TAM keeps expanding.','New indications + capacity coming online.','Street under-models label expansion and durability of pricing.','["Capacity expansion","New indications"]'::jsonb,'["Reimbursement pushback","Competitive launches"]'::jsonb,1050,820,820,28,'24m','Healthcare',5,4.0,'dcf',1250,1050,720, now()-interval '4 days', now()+interval '30 days',NULL,NULL,NULL,NULL,NULL,'d6f00000-0000-4000-a000-000000000001', now()+interval '5 days','d1000000-0000-4000-a000-000000000012',NULL, now()-interval '14 days'),
 ('d4000000-0000-4000-a000-000000000012','84c0372a-6b0a-4126-963e-9b0aa6660570','73da53d7-676b-419a-a20b-f1a728c92fe7','V','Visa','long','d1000000-0000-4000-a000-000000000013','d1000000-0000-4000-a000-000000000006','committee_scheduled','active','Secular volume compounder at a fair price','Cross-border recovery + new flows (B2B, tokenization) extend runway.','Cross-border volumes back above trend.','Regulatory fears overshadow durable network economics.','["Cross-border growth","New-flows adoption"]'::jsonb,'["Interchange regulation","Recession spend"]'::jsonb,320,265,265,21,'long-term','Financials',4,3.5,'dcf',360,320,250, now()-interval '7 days', now()+interval '25 days',NULL,NULL,NULL,NULL,NULL,'d6f00000-0000-4000-a000-000000000001', now()+interval '5 days','d1000000-0000-4000-a000-000000000013',NULL, now()-interval '16 days'),
 -- ── committee_vote ──
 ('d4000000-0000-4000-a000-000000000013','84c0372a-6b0a-4126-963e-9b0aa6660570','56e26029-5600-42f4-9464-ab3728f14177','CAT','Caterpillar','long','d1000000-0000-4000-a000-000000000017','d1000000-0000-4000-a000-000000000009','committee_vote','active','Infrastructure + energy-transition capex supercycle','Backlog and services mix lift margins through the cycle.','Mega-project pipeline funding is unlocking.','Consensus fears a cyclical peak; we see a longer capex wave.','["Backlog conversion","Services growth"]'::jsonb,'["Cyclical rollover","Dealer inventory"]'::jsonb,410,335,335,22,'12m','Industrials',4,3.0,'comps',470,410,300, now()-interval '2 days', now()+interval '20 days',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'d1000000-0000-4000-a000-000000000017',NULL, now()-interval '12 days'),
 ('d4000000-0000-4000-a000-000000000014','84c0372a-6b0a-4126-963e-9b0aa6660570','76a5af44-191c-422b-b428-17803eb799bd','ENPH','Enphase Energy','short','d1000000-0000-4000-a000-000000000014','d1000000-0000-4000-a000-000000000008','committee_vote','active','Resi-solar destocking longer than hoped','High-rate demand air-pocket and inventory overhang pressure estimates.','Channel inventory still elevated into a soft demand backdrop.','Bulls price a fast normalization; we see a drawn-out reset.','["Estimate cuts","Margin pressure"]'::jsonb,'["Rate cuts revive demand","EU rebound"]'::jsonb,78,112,112,-30,'6m','Energy',3,1.5,'comps',65,78,130, now()-interval '3 days', now()+interval '25 days',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'d1000000-0000-4000-a000-000000000014',NULL, now()-interval '11 days'),
 -- ── decision: accepted (P15, presenter-owned) + rejected archive (P16) ──
 ('d4000000-0000-4000-a000-000000000015','84c0372a-6b0a-4126-963e-9b0aa6660570','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','MSFT','Microsoft','long','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','e8e3758f-9a71-4efb-9532-228ae257d09e','decision','accepted','Copilot monetization + Azure AI reacceleration','AI attach across M365 and Azure compounds the highest-quality franchise.','Azure growth re-accelerating with AI workloads.','Street under-models Copilot seat monetization pace.','["Copilot attach","Azure AI ramp"]'::jsonb,'["AI capex digestion","Regulatory scrutiny"]'::jsonb,520,415,415,25,'24m','TMT',5,4.5,'dcf',600,520,380, now()-interval '15 days', now()+interval '30 days','accepted', now()-interval '10 days','Committee approved: highest-conviction core holding.',NULL,NULL,NULL,NULL,'e09e4c06-dd92-4190-82b6-bb75b0f8c3be', now()-interval '10 days', now()-interval '40 days'),
 ('d4000000-0000-4000-a000-000000000016','84c0372a-6b0a-4126-963e-9b0aa6660570','c8880eae-61a7-441e-849c-11624cb6be49','SBUX','Starbucks','long','d1000000-0000-4000-a000-000000000016','d1000000-0000-4000-a000-000000000007','decision','rejected','China + US traffic both softening','Turnaround optionality did not clear our hurdle vs. sector alternatives.','Same-store sales decelerating in both key regions.','We could not get comfortable the reset is near a bottom.','["New CEO plan","Loyalty relaunch"]'::jsonb,'["China competition","US traffic decline"]'::jsonb,95,88,88,8,'12m','Consumer',2,0,'comps',110,95,75, now()-interval '25 days', now()+interval '40 days','rejected', now()-interval '20 days','Committee passed: risk/reward below hurdle; watchlist instead.','Rejected at IC — turnaround unproven; better risk/reward elsewhere.', now()-interval '20 days',NULL,NULL,NULL,NULL, now()-interval '55 days'),
 -- ── in_portfolio (resolved theses → hindsight) ──
 ('d4000000-0000-4000-a000-000000000017','84c0372a-6b0a-4126-963e-9b0aa6660570','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','GOOGL','Alphabet','long','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','e8e3758f-9a71-4efb-9532-228ae257d09e','in_portfolio','accepted','Search resilient; Cloud + Gemini optionality free','AI-overview fears overdone; Cloud margin inflection under-appreciated.','Cloud turning profitable while Search holds share.','Market priced an AI-disruption discount that has not materialized.','["Cloud margin ramp","Gemini monetization"]'::jsonb,'["Search disruption","Ad cyclicality"]'::jsonb,205,138,138,48,'24m','TMT',5,4.0,'dcf',230,205,150, now()-interval '95 days', now()-interval '10 days','accepted', now()-interval '150 days','Core holding — thesis tracking ahead of plan.',NULL,NULL,NULL,NULL,'e09e4c06-dd92-4190-82b6-bb75b0f8c3be', now()-interval '30 days', now()-interval '210 days'),
 ('d4000000-0000-4000-a000-000000000018','84c0372a-6b0a-4126-963e-9b0aa6660570','c16275b2-42eb-410a-89d7-758788c08fdc','ABBV','AbbVie','long','d1000000-0000-4000-a000-000000000012','d1000000-0000-4000-a000-000000000005','in_portfolio','accepted','Post-Humira base troughs; Skyrizi/Rinvoq offset','Immunology duo out-grows the Humira erosion faster than modeled.','Skyrizi/Rinvoq scripts beating each quarter.','Street over-discounted the Humira patent cliff.','["Skyrizi/Rinvoq ramp","Pipeline readouts"]'::jsonb,'["Humira erosion pace","Pricing policy"]'::jsonb,205,178,178,15,'12m','Healthcare',4,3.0,'dcf',225,205,165, now()-interval '70 days', now()-interval '5 days','accepted', now()-interval '120 days','Core holding — performing roughly in line.',NULL,NULL,NULL,NULL,'d1000000-0000-4000-a000-000000000012', now()-interval '25 days', now()-interval '180 days'),
 ('d4000000-0000-4000-a000-000000000019','84c0372a-6b0a-4126-963e-9b0aa6660570','73da53d7-676b-419a-a20b-f1a728c92fe7','MA','Mastercard','long','d1000000-0000-4000-a000-000000000013','d1000000-0000-4000-a000-000000000006','in_portfolio','accepted','Network compounder; value-added services accelerate','VAS mix shift lifts growth and margins above card-network base.','Services revenue outgrowing payments volume.','Consensus under-models the services attach ramp.','["VAS growth","Cross-border volume"]'::jsonb,'["Regulation","Consumer slowdown"]'::jsonb,540,405,405,33,'long-term','Financials',4,3.5,'dcf',600,540,420, now()-interval '85 days', now()-interval '8 days','accepted', now()-interval '140 days','Core holding — outperforming.',NULL,NULL,NULL,NULL,'d1000000-0000-4000-a000-000000000013', now()-interval '20 days', now()-interval '200 days'),
 -- ── exited (archive lane, with reasons + hindsight) ──
 ('d4000000-0000-4000-a000-000000000020','84c0372a-6b0a-4126-963e-9b0aa6660570','76a5af44-191c-422b-b428-17803eb799bd','XOM','Exxon Mobil','long','d1000000-0000-4000-a000-000000000014','d1000000-0000-4000-a000-000000000008','exited','accepted','Capital-discipline + buyback yield in a strong-crude tape','Downstream + buybacks compound while crude stays elevated.','Shareholder returns stepping up on strong cash flow.','We over-weighted crude staying elevated.','["Buyback pace","Guyana ramp"]'::jsonb,'["Crude reversal","Demand destruction"]'::jsonb,125,108,108,16,'12m','Energy',3,2.0,'comps',140,125,95, now()-interval '30 days', now()-interval '20 days','accepted', now()-interval '160 days','Exited: crude rolled over, thesis window closed.','Sold — crude reversed; macro thesis no longer held.', now()-interval '30 days',NULL,NULL,'d1000000-0000-4000-a000-000000000014',NULL, now()-interval '230 days'),
 ('d4000000-0000-4000-a000-000000000021','84c0372a-6b0a-4126-963e-9b0aa6660570','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','ROKU','Roku','long','fc2ca48d-c5c4-4713-a156-4c43d0394175','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','exited','accepted','Platform monetization inflects as ad market heals','ARPU re-acceleration + margin turn as CTV ad spend recovers.','Ad market showing early signs of recovery.','Ad recovery stalled and competition intensified — thesis broke.','["ARPU recovery","Platform margin turn"]'::jsonb,'["Ad-market weakness","CTV competition"]'::jsonb,95,62,62,53,'12m','TMT',4,1.5,'comps',120,95,55, now()-interval '25 days', now()-interval '15 days','accepted', now()-interval '110 days','Exited at a loss — guidance cut invalidated the thesis.','Thesis broke — guidance cut; ad recovery failed to materialize.', now()-interval '25 days',NULL,NULL,'fc2ca48d-c5c4-4713-a156-4c43d0394175',NULL, now()-interval '175 days'),
 ('d4000000-0000-4000-a000-000000000022','84c0372a-6b0a-4126-963e-9b0aa6660570','0ab6e817-2dc8-4bcd-8b73-70573ca68aac','FCX','Freeport-McMoRan','long','d1000000-0000-4000-a000-000000000010','e8e3758f-9a71-4efb-9532-228ae257d09e','exited','accepted','Copper deficit + electrification demand','Structural copper shortfall meets EV/grid demand; volume + price optionality.','Copper inventories drawing down into a supply gap.','Thesis played out — booked the gain at target.','["Copper price","Grasberg volumes"]'::jsonb,'["China property drag","Mine disruptions"]'::jsonb,52,38,38,37,'12m','Metals & Mining',4,2.5,'comps',60,52,34, now()-interval '20 days', now()-interval '12 days','accepted', now()-interval '95 days','Exited at target — booked the gain.','Target reached — booked gain, redeployed capital.', now()-interval '20 days',NULL,NULL,'d1000000-0000-4000-a000-000000000010',NULL, now()-interval '150 days'),
 ('d4000000-0000-4000-a000-000000000023','84c0372a-6b0a-4126-963e-9b0aa6660570','56e26029-5600-42f4-9464-ab3728f14177','GE','GE Aerospace','long','d1000000-0000-4000-a000-000000000017','d1000000-0000-4000-a000-000000000009','exited','accepted','Post-spin aftermarket margin re-rating','Services/aftermarket mix drives durable margin expansion post-spin.','Spin-off unlocked a cleaner aftermarket story.','Entry timing poor — position stopped out on a drawdown.','["Aftermarket growth","Shop-visit cycle"]'::jsonb,'["OEM cost inflation","Air-traffic shock"]'::jsonb,180,155,155,16,'12m','Industrials',3,1.5,'dcf',210,180,140, now()-interval '35 days', now()-interval '25 days','accepted', now()-interval '100 days','Exited on stop-loss — timing, not thesis.','Stop-loss hit — exited to manage risk.', now()-interval '35 days',NULL,NULL,'d1000000-0000-4000-a000-000000000017',NULL, now()-interval '140 days'),
  -- ── cross_desk_review (new stage — thesis frozen, cross-desk PMs reviewing).
  --    TSM sits >30 days in stage → fires the amber aging (>30d) flag. ──
  ('d4000000-0000-4000-a000-000000000024','84c0372a-6b0a-4126-963e-9b0aa6660570','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','TSM','Taiwan Semiconductor','long','d1000000-0000-4000-a000-000000000011','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','cross_desk_review','active','AI foundry demand outruns leading-edge supply','Node leadership plus CoWoS packaging make TSMC the toll road for every AI accelerator; pricing power is under-modeled.','3nm/2nm sold out; advanced packaging is the binding constraint.','Street treats TSM as cyclical semis, not a structural AI-supply monopoly.','["2nm ramp","CoWoS capacity adds","AI-accelerator TAM"]'::jsonb,'["China/Taiwan geopolitics","Cyclical PC/handset drag"]'::jsonb,210,172,172,22,'12m','TMT',4,3.0,'dcf',245,210,155, now()-interval '40 days', now()+interval '55 days',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'d1000000-0000-4000-a000-000000000011',NULL, now()-interval '52 days'),
  ('d4000000-0000-4000-a000-000000000025','84c0372a-6b0a-4126-963e-9b0aa6660570','c16275b2-42eb-410a-89d7-758788c08fdc','UNH','UnitedHealth Group','long','d1000000-0000-4000-a000-000000000012','d1000000-0000-4000-a000-000000000005','cross_desk_review','active','Optum compounding masks a de-risked managed-care base','Optum Health/Rx vertical integration compounds earnings while the market fixates on MLR noise.','Medicare Advantage repricing plus Optum growth reset the earnings base.','Consensus over-weights near-term MLR headlines, under-models Optum operating leverage.','["Optum margin expansion","MA rate notice","Value-based care adds"]'::jsonb,'["MLR spikes","Regulatory/DOJ scrutiny"]'::jsonb,620,500,500,24,'24m','Healthcare',4,3.0,'dcf',700,620,470, now()-interval '12 days', now()+interval '70 days',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'d1000000-0000-4000-a000-000000000012',NULL, now()-interval '22 days'),
  ('d4000000-0000-4000-a000-000000000026','84c0372a-6b0a-4126-963e-9b0aa6660570','73da53d7-676b-419a-a20b-f1a728c92fe7','JPM','JPMorgan Chase','long','d1000000-0000-4000-a000-000000000013','d1000000-0000-4000-a000-000000000006','cross_desk_review','active','Fortress balance sheet earns through a higher-for-longer curve','NII resilience, loan-share gains, and buybacks compound tangible book faster than the peak-earnings fear implies.','Deposit costs stabilizing while loan share climbs.','Market extrapolates NII rolling over; misses fee-income and share-gain offsets.','["NII stabilization","Card/loan share gains","Buyback pace"]'::jsonb,'["Credit normalization","Basel capital-rule drag"]'::jsonb,250,205,205,21,'12m','Financials',4,3.5,'comps',285,250,185, now()-interval '18 days', now()+interval '35 days',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'d1000000-0000-4000-a000-000000000013',NULL, now()-interval '28 days')
ON CONFLICT (id) DO NOTHING;

-- ── 5a. Pitch VOTES (committee-stage) — yes/no/abstain WITH rationales ───────
INSERT INTO public.org_pitch_votes (id, pitch_id, voter_member_id, vote, rationale, conviction_level, recused, created_at) VALUES
 -- LLY (committee_scheduled) — pre-votes trickling in
 ('d4a00000-0000-4000-a000-000000000001','d4000000-0000-4000-a000-000000000011','e8e3758f-9a71-4efb-9532-228ae257d09e','yes','Best risk-adjusted compounder on the board; size it up.',5,false, now()-interval '2 days'),
 ('d4a00000-0000-4000-a000-000000000002','d4000000-0000-4000-a000-000000000011','d1000000-0000-4000-a000-000000000005','yes','Supply-gated demand is real; capacity is the only question.',5,false, now()-interval '2 days'),
 ('d4a00000-0000-4000-a000-000000000003','d4000000-0000-4000-a000-000000000011','d1000000-0000-4000-a000-000000000006','abstain','Outside my circle — deferring to healthcare desk.',3,false, now()-interval '2 days'),
 -- CAT (committee_vote)
 ('d4a00000-0000-4000-a000-000000000004','d4000000-0000-4000-a000-000000000013','e8e3758f-9a71-4efb-9532-228ae257d09e','yes','Backlog visibility supports the multiple; approve.',4,false, now()-interval '1 day'),
 ('d4a00000-0000-4000-a000-000000000005','d4000000-0000-4000-a000-000000000013','d1000000-0000-4000-a000-000000000009','yes','Services mix underwrites the margin story.',4,false, now()-interval '1 day'),
 ('d4a00000-0000-4000-a000-000000000006','d4000000-0000-4000-a000-000000000013','d1000000-0000-4000-a000-000000000008','no','Late-cycle entry worries me; prefer to wait.',3,false, now()-interval '1 day'),
 ('d4a00000-0000-4000-a000-000000000007','d4000000-0000-4000-a000-000000000013','d1000000-0000-4000-a000-000000000010','abstain','Conflicted — hold a related name personally.',2,true, now()-interval '1 day'),
 -- MSFT (decision — accepted)
 ('d4a00000-0000-4000-a000-000000000008','d4000000-0000-4000-a000-000000000015','e8e3758f-9a71-4efb-9532-228ae257d09e','yes','Core quality holding; highest conviction of the cycle.',5,false, now()-interval '11 days'),
 ('d4a00000-0000-4000-a000-000000000009','d4000000-0000-4000-a000-000000000015','1ff8ab9a-1c40-4b38-9812-e28ce7a151a3','yes','Azure reacceleration is underappreciated; approve.',5,false, now()-interval '11 days'),
 ('d4a00000-0000-4000-a000-000000000010','d4000000-0000-4000-a000-000000000015','d1000000-0000-4000-a000-000000000005','yes','Balance-sheet fortress with AI optionality.',4,false, now()-interval '11 days'),
 ('d4a00000-0000-4000-a000-000000000011','d4000000-0000-4000-a000-000000000015','d1000000-0000-4000-a000-000000000007','yes','Fine to fund from the cash sleeve.',4,false, now()-interval '11 days'),
 -- SBUX (decision — rejected)
 ('d4a00000-0000-4000-a000-000000000012','d4000000-0000-4000-a000-000000000016','e8e3758f-9a71-4efb-9532-228ae257d09e','no','Turnaround unproven; risk/reward below hurdle.',2,false, now()-interval '21 days'),
 ('d4a00000-0000-4000-a000-000000000013','d4000000-0000-4000-a000-000000000016','d1000000-0000-4000-a000-000000000007','no','China competitive intensity is worsening.',2,false, now()-interval '21 days'),
 ('d4a00000-0000-4000-a000-000000000014','d4000000-0000-4000-a000-000000000016','d1000000-0000-4000-a000-000000000006','abstain','Could go either way — not enough edge.',3,false, now()-interval '21 days')
ON CONFLICT (id) DO NOTHING;

-- ── 5b. Pitch DELIVERABLES (models/memos/decks so stage gates can pass) ──────
INSERT INTO public.org_pitch_deliverables (id, pitch_id, kind, title, file_type, uploaded_by_member_id, uploaded_at) VALUES
 ('d4b00000-0000-4000-a000-000000000009','d4000000-0000-4000-a000-000000000009','model','CRM — 3-statement DCF (v2)','xlsx','d1000000-0000-4000-a000-000000000011', now()-interval '8 days'),
 ('d4b00000-0000-4000-a000-000000000010','d4000000-0000-4000-a000-000000000010','memo','NKE — short thesis memo','pdf','d1000000-0000-4000-a000-000000000016', now()-interval '36 days'),
 ('d4b00000-0000-4000-a000-000000000011','d4000000-0000-4000-a000-000000000011','model','LLY — incretin TAM buildup','xlsx','d1000000-0000-4000-a000-000000000012', now()-interval '6 days'),
 ('d4b00000-0000-4000-a000-000000000111','d4000000-0000-4000-a000-000000000011','deck','LLY — IC pitch deck','pptx','d1000000-0000-4000-a000-000000000012', now()-interval '5 days'),
 ('d4b00000-0000-4000-a000-000000000012','d4000000-0000-4000-a000-000000000012','model','V — network economics model','xlsx','d1000000-0000-4000-a000-000000000013', now()-interval '9 days'),
 ('d4b00000-0000-4000-a000-000000000013','d4000000-0000-4000-a000-000000000013','deck','CAT — committee deck','pptx','d1000000-0000-4000-a000-000000000017', now()-interval '3 days'),
 ('d4b00000-0000-4000-a000-000000000014','d4000000-0000-4000-a000-000000000014','memo','ENPH — short one-pager','pdf','d1000000-0000-4000-a000-000000000014', now()-interval '4 days'),
 ('d4b00000-0000-4000-a000-000000000015','d4000000-0000-4000-a000-000000000015','model','MSFT — segment model + Copilot attach','xlsx','e09e4c06-dd92-4190-82b6-bb75b0f8c3be', now()-interval '16 days'),
 ('d4b00000-0000-4000-a000-000000000017','d4000000-0000-4000-a000-000000000017','memo','GOOGL — Cloud margin deep dive','pdf','e09e4c06-dd92-4190-82b6-bb75b0f8c3be', now()-interval '90 days'),
 ('d4b00000-0000-4000-a000-000000000019','d4000000-0000-4000-a000-000000000019','model','MA — VAS attach model','xlsx','d1000000-0000-4000-a000-000000000013', now()-interval '85 days')
ON CONFLICT (id) DO NOTHING;

-- ── 5c. Pitch STAGE HISTORY (advancement trail) ─────────────────────────────
INSERT INTO public.org_pitch_stage_history (id, pitch_id, from_stage, to_stage, actor_member_id, note, created_at) VALUES
 ('d4c00000-0000-4000-a000-000000000151','d4000000-0000-4000-a000-000000000015','idea','research_approved','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','Approved for deep dive.', now()-interval '38 days'),
 ('d4c00000-0000-4000-a000-000000000152','d4000000-0000-4000-a000-000000000015','research_approved','pm_review','d1000000-0000-4000-a000-000000000011','Model complete.', now()-interval '25 days'),
 ('d4c00000-0000-4000-a000-000000000153','d4000000-0000-4000-a000-000000000015','pm_review','committee_vote','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','Cleared PM review.', now()-interval '18 days'),
 ('d4c00000-0000-4000-a000-000000000154','d4000000-0000-4000-a000-000000000015','committee_vote','decision','e8e3758f-9a71-4efb-9532-228ae257d09e','IC approved — added to book.', now()-interval '10 days'),
 ('d4c00000-0000-4000-a000-000000000171','d4000000-0000-4000-a000-000000000017','committee_vote','decision','e8e3758f-9a71-4efb-9532-228ae257d09e','Approved.', now()-interval '150 days'),
 ('d4c00000-0000-4000-a000-000000000172','d4000000-0000-4000-a000-000000000017','decision','in_portfolio','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','Position opened.', now()-interval '148 days'),
 ('d4c00000-0000-4000-a000-000000000211','d4000000-0000-4000-a000-000000000021','in_portfolio','exited','fc2ca48d-c5c4-4713-a156-4c43d0394175','Thesis broke — exited at a loss.', now()-interval '25 days'),
 ('d4c00000-0000-4000-a000-000000000111','d4000000-0000-4000-a000-000000000011','pm_review','committee_scheduled','d1000000-0000-4000-a000-000000000005','Scheduled for the next IC.', now()-interval '4 days')
ON CONFLICT (id) DO NOTHING;

-- ── 5d. Pitch DISCUSSION messages ───────────────────────────────────────────
INSERT INTO public.org_pitch_discussion_messages (id, pitch_id, author_member_id, parent_message_id, body, created_at) VALUES
 ('d4d00000-0000-4000-a000-000000000091','d4000000-0000-4000-a000-000000000009','e09e4c06-dd92-4190-82b6-bb75b0f8c3be',NULL,'Can you sensitize the FCF bridge to a slower Data Cloud attach?', now()-interval '5 days'),
 ('d4d00000-0000-4000-a000-000000000092','d4000000-0000-4000-a000-000000000009','d1000000-0000-4000-a000-000000000011','d4d00000-0000-4000-a000-000000000091','Added a bear column — even at half the attach, FCF/sh still compounds low-teens.', now()-interval '4 days'),
 ('d4d00000-0000-4000-a000-000000000131','d4000000-0000-4000-a000-000000000013','d1000000-0000-4000-a000-000000000008',NULL,'Worried we are buying the cyclical peak here.', now()-interval '2 days'),
 ('d4d00000-0000-4000-a000-000000000132','d4000000-0000-4000-a000-000000000013','d1000000-0000-4000-a000-000000000017','d4d00000-0000-4000-a000-000000000131','Backlog covers ~2 years of revenue — this is not a normal cyclical top.', now()-interval '1 day'),
 ('d4d00000-0000-4000-a000-000000000111','d4000000-0000-4000-a000-000000000011','e8e3758f-9a71-4efb-9532-228ae257d09e',NULL,'Strong work. Let us blind-ballot this at the IC given the size.', now()-interval '3 days')
ON CONFLICT (id) DO NOTHING;

-- ── 5e. Pitch HINDSIGHT (resolved theses → calibration + fund analytics) ────
--    Outcomes are internally consistent with each pitch's conviction_level and
--    with the ratings/calibration seeded further below.
INSERT INTO public.org_pitch_hindsight (pitch_id, computed_at, current_price, price_at_decision, return_pct, benchmark_return_pct, alpha_pct, max_drawdown_pct, current_state) VALUES
 ('d4000000-0000-4000-a000-000000000017', now()-interval '1 day',195,138, 41.3, 18.0, 23.3, -8.0,'outperforming'),
 ('d4000000-0000-4000-a000-000000000018', now()-interval '1 day',190,178,  6.7,  7.0, -0.3, -9.0,'roughly_inline'),
 ('d4000000-0000-4000-a000-000000000019', now()-interval '1 day',525,405, 29.6, 14.0, 15.6, -6.0,'outperforming'),
 ('d4000000-0000-4000-a000-000000000020', now()-interval '1 day', 99,108, -8.3, 10.0,-18.3,-15.0,'underperforming'),
 ('d4000000-0000-4000-a000-000000000021', now()-interval '1 day', 48, 62,-22.6, 12.0,-34.6,-38.0,'underperforming'),
 ('d4000000-0000-4000-a000-000000000022', now()-interval '1 day', 52, 38, 36.8,  9.0, 27.8,-11.0,'outperforming'),
 ('d4000000-0000-4000-a000-000000000023', now()-interval '1 day',140,155, -9.7, 11.0,-20.7,-18.0,'underperforming')
ON CONFLICT (pitch_id) DO NOTHING;

-- ============================================================================
-- 6. RESEARCH LIBRARY — 34 notes across every doc_type & status, incl. a
--    superseded → published chain (N20→N21), exemplars, alum-authored, and
--    pitch links. abstract filled on every row. embedding intentionally NULL.
-- ============================================================================
INSERT INTO public.org_research_notes
 (id, org_id, author_id, title, body, abstract, ticker, sector, tags, visibility, team_id,
  doc_type, status, version, superseded_by, term, author_role_at_time, is_alum_authored, is_exemplar,
  pitch_id, view_count, download_count, published_at, created_at, updated_at) VALUES
 ('d5000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','b0a9a9d4-54a2-4461-a203-95d869dae6c1','MSFT — Copilot monetization deep dive','Full write-up of the Copilot attach and Azure AI reacceleration thesis.','Copilot seat monetization and Azure AI are under-modeled; MSFT is the core quality compounder.','MSFT','TMT','{ai,software,core-holding}','org','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','pitch_memo','published',1,NULL,'Fall 2026','TMT Portfolio Manager',false,true,'d4000000-0000-4000-a000-000000000015',214,38, now()-interval '30 days', now()-interval '40 days', now()-interval '30 days'),
 ('d5000000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','b0a9a9d4-54a2-4461-a203-95d869dae6c1','GOOGL — Cloud margin inflection','Why the AI-disruption discount on Search is overdone and Cloud profitability is the swing factor.','Alphabet Cloud margin inflection is mispriced; Search fears overdone.','GOOGL','TMT','{ai,cloud}','org','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','pitch_memo','published',1,NULL,'Fall 2026','TMT Portfolio Manager',false,false,'d4000000-0000-4000-a000-000000000017',187,29, now()-interval '90 days', now()-interval '95 days', now()-interval '90 days'),
 ('d5000000-0000-4000-a000-000000000003','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000012','LLY — incretin TAM model notes','Buildup of the incretin TAM and capacity constraints behind the LLY pitch.','LLY incretin franchise remains supply-gated; TAM buildup supports upside.','LLY','Healthcare','{pharma,glp1}','org','c16275b2-42eb-410a-89d7-758788c08fdc','model','published',1,NULL,'Fall 2026','Senior Analyst — Healthcare',false,false,'d4000000-0000-4000-a000-000000000011',142,24, now()-interval '6 days', now()-interval '8 days', now()-interval '6 days'),
 ('d5000000-0000-4000-a000-000000000004','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000005','Incretin market primer','A primer on the GLP-1/GIP landscape, players, and reimbursement dynamics.','Reference primer on the incretin market for the healthcare desk.','LLY','Healthcare','{primer,pharma}','org','c16275b2-42eb-410a-89d7-758788c08fdc','primer','published',1,NULL,'Fall 2026','Healthcare PM',false,true,NULL,98,12, now()-interval '35 days', now()-interval '38 days', now()-interval '35 days'),
 ('d5000000-0000-4000-a000-000000000005','84c0372a-6b0a-4126-963e-9b0aa6660570','c45adbae-9cce-4508-9a1e-62a78efdc4b5','AMD — accelerator duopoly note','Working note on the MI300 ramp and datacenter GPU share.','AMD is the credible #2 accelerator; GPU attach is under-modeled.','AMD','TMT','{semis,ai}','team','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','note','published',1,NULL,'Fall 2026','Analyst — TMT',false,false,'d4000000-0000-4000-a000-000000000001',64,4, now()-interval '5 days', now()-interval '5 days', now()-interval '5 days'),
 ('d5000000-0000-4000-a000-000000000006','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000011','CRM — FCF compounding memo','Draft pitch memo pending PM review.','Salesforce margin inflection plus Data Cloud attach re-rates FCF/share.','CRM','TMT','{software}','org','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','pitch_memo','under_review',1,NULL,'Fall 2026','Senior Analyst — TMT',false,false,'d4000000-0000-4000-a000-000000000009',41,2,NULL, now()-interval '8 days', now()-interval '4 days'),
 ('d5000000-0000-4000-a000-000000000007','84c0372a-6b0a-4126-963e-9b0aa6660570','c45adbae-9cce-4508-9a1e-62a78efdc4b5','ROKU post-mortem — what broke','Retro on the ROKU loss: ad recovery stalled, guidance cut invalidated the thesis.','Post-mortem on ROKU: the ad-recovery thesis broke; lessons on catalyst dependence.','ROKU','TMT','{postmortem,lessons}','org','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','post_mortem','published',1,NULL,'Fall 2026','Analyst — TMT',false,true,'d4000000-0000-4000-a000-000000000021',176,31, now()-interval '20 days', now()-interval '22 days', now()-interval '20 days'),
 ('d5000000-0000-4000-a000-000000000008','84c0372a-6b0a-4126-963e-9b0aa6660570','e9a6277b-7cc2-4395-b85b-6de8ddbada83','IC minutes — MSFT approval','Minutes from the IC session that approved MSFT.','Committee minutes: MSFT approved as a core holding.',NULL,'TMT','{minutes,ic}','org',NULL,'ic_minutes','published',1,NULL,'Fall 2026','President & CIO',false,false,'d4000000-0000-4000-a000-000000000015',120,9, now()-interval '10 days', now()-interval '10 days', now()-interval '10 days'),
 ('d5000000-0000-4000-a000-000000000009','84c0372a-6b0a-4126-963e-9b0aa6660570','c45adbae-9cce-4508-9a1e-62a78efdc4b5','Sell-side digest — semis cycle','Archived reading: third-party notes on the semiconductor cycle.','External reading digest on the semis cycle (archived).','AMD','TMT','{reading,semis}','org','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','reading','archived',1,NULL,'Spring 2026','Analyst — TMT',false,false,NULL,53,3, now()-interval '120 days', now()-interval '130 days', now()-interval '120 days'),
 ('d5000000-0000-4000-a000-000000000010','84c0372a-6b0a-4126-963e-9b0aa6660570','b0a9a9d4-54a2-4461-a203-95d869dae6c1','NVDA — follow-up scratch note','Private scratch note; not yet ready to share.','Draft follow-up on NVDA datacenter demand.','NVDA','TMT','{draft}','private','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','note','draft',1,NULL,'Fall 2026','TMT Portfolio Manager',false,false,NULL,3,0,NULL, now()-interval '3 days', now()-interval '3 days'),
 ('d5000000-0000-4000-a000-000000000011','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000013','V — network economics model','Model notes for the Visa pitch.','Visa network economics and new-flows model behind the pitch.','V','Financials','{payments,model}','org','73da53d7-676b-419a-a20b-f1a728c92fe7','model','published',1,NULL,'Fall 2026','Senior Analyst — Financials',false,false,'d4000000-0000-4000-a000-000000000012',88,15, now()-interval '9 days', now()-interval '12 days', now()-interval '9 days'),
 ('d5000000-0000-4000-a000-000000000012','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000013','MA — VAS attach memo','Pitch memo for Mastercard, value-added services attach.','Mastercard VAS mix shift lifts growth and margins above the network base.','MA','Financials','{payments}','org','73da53d7-676b-419a-a20b-f1a728c92fe7','pitch_memo','published',1,NULL,'Fall 2026','Senior Analyst — Financials',false,false,'d4000000-0000-4000-a000-000000000019',131,22, now()-interval '85 days', now()-interval '88 days', now()-interval '85 days'),
 ('d5000000-0000-4000-a000-000000000013','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000006','Payments networks 101','Desk primer on card-network economics.','Reference primer on payments-network economics for the financials desk.','V','Financials','{primer,payments}','org','73da53d7-676b-419a-a20b-f1a728c92fe7','primer','published',1,NULL,'Fall 2026','Financials PM',false,true,NULL,109,18, now()-interval '60 days', now()-interval '62 days', now()-interval '60 days'),
 ('d5000000-0000-4000-a000-000000000014','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000013','GS — capital-markets rebound note','Working note on the Goldman thesis.','Goldman: trough IB wallet recovers; buyback yield compounds BVPS.','GS','Financials','{banks}','team','73da53d7-676b-419a-a20b-f1a728c92fe7','note','published',1,NULL,'Fall 2026','Senior Analyst — Financials',false,false,'d4000000-0000-4000-a000-000000000007',47,3, now()-interval '40 days', now()-interval '47 days', now()-interval '40 days'),
 ('d5000000-0000-4000-a000-000000000015','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000017','CAT — committee model','Model under review ahead of the IC vote.','Caterpillar backlog and services-mix margin model.','CAT','Industrials','{model,capex}','org','56e26029-5600-42f4-9464-ab3728f14177','model','under_review',1,NULL,'Fall 2026','Analyst — Industrials',false,false,'d4000000-0000-4000-a000-000000000013',33,1,NULL, now()-interval '3 days', now()-interval '2 days'),
 ('d5000000-0000-4000-a000-000000000016','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000017','DE — precision-ag attach note','Note on Deere software attach and margin floor.','Deere precision-ag attach raises the structural margin floor.','DE','Industrials','{machinery}','org','56e26029-5600-42f4-9464-ab3728f14177','note','published',1,NULL,'Fall 2026','Analyst — Industrials',false,false,'d4000000-0000-4000-a000-000000000008',52,4, now()-interval '18 days', now()-interval '18 days', now()-interval '18 days'),
 ('d5000000-0000-4000-a000-000000000017','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000009','Precision agriculture primer','Desk primer on precision-ag technology and adoption.','Reference primer on precision agriculture for the industrials desk.','DE','Industrials','{primer}','org','56e26029-5600-42f4-9464-ab3728f14177','primer','published',1,NULL,'Fall 2026','Industrials PM',false,false,NULL,71,8, now()-interval '55 days', now()-interval '58 days', now()-interval '55 days'),
 ('d5000000-0000-4000-a000-000000000018','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000014','FSLR — IRA backlog memo','Pitch memo for First Solar.','First Solar IRA-backed backlog and domestic-content premium are under-appreciated.','FSLR','Energy','{solar,ira}','org','76a5af44-191c-422b-b428-17803eb799bd','pitch_memo','published',1,NULL,'Fall 2026','Senior Analyst — Energy',false,false,'d4000000-0000-4000-a000-000000000004',77,11, now()-interval '20 days', now()-interval '20 days', now()-interval '20 days'),
 ('d5000000-0000-4000-a000-000000000019','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000014','XOM post-mortem','Retro on the XOM exit: over-weighted crude staying elevated.','Post-mortem on XOM: macro/crude thesis reversed; sizing lessons.','XOM','Energy','{postmortem}','org','76a5af44-191c-422b-b428-17803eb799bd','post_mortem','published',1,NULL,'Fall 2026','Senior Analyst — Energy',false,false,'d4000000-0000-4000-a000-000000000020',94,7, now()-interval '20 days', now()-interval '22 days', now()-interval '20 days'),
 ('d5000000-0000-4000-a000-000000000020','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000008','Energy sleeve view — Q1 (superseded)','Original Q1 sleeve positioning note. Superseded by the Q2 update.','Q1 energy sleeve view — superseded by the Q2 revision.','XOM','Energy','{sleeve}','org','76a5af44-191c-422b-b428-17803eb799bd','note','superseded',1,'d5000000-0000-4000-a000-000000000021','Spring 2026','Energy PM',false,false,NULL,45,2, now()-interval '120 days', now()-interval '125 days', now()-interval '95 days'),
 ('d5000000-0000-4000-a000-000000000021','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000008','Energy sleeve view — Q2 (v2)','Updated sleeve positioning: trim crude beta, add renewables optionality.','Q2 energy sleeve view (v2): reduce crude beta, rotate toward renewables.','XOM','Energy','{sleeve}','org','76a5af44-191c-422b-b428-17803eb799bd','note','published',2,NULL,'Fall 2026','Energy PM',false,false,NULL,68,6, now()-interval '90 days', now()-interval '92 days', now()-interval '90 days'),
 ('d5000000-0000-4000-a000-000000000022','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000010','FCX — copper deficit memo','Pitch memo for Freeport; exemplar write-up.','Freeport: structural copper deficit meets electrification demand.','FCX','Metals & Mining','{copper,commodities}','org','0ab6e817-2dc8-4bcd-8b73-70573ca68aac','pitch_memo','published',1,NULL,'Fall 2026','Metals & Mining PM',false,true,'d4000000-0000-4000-a000-000000000022',158,27, now()-interval '85 days', now()-interval '90 days', now()-interval '85 days'),
 ('d5000000-0000-4000-a000-000000000023','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000010','Copper supply/demand tracker','Ongoing tracker of copper inventories and mine supply.','Working tracker of the copper supply/demand balance.','FCX','Metals & Mining','{copper,tracker}','team','0ab6e817-2dc8-4bcd-8b73-70573ca68aac','note','published',1,NULL,'Fall 2026','Metals & Mining PM',false,false,NULL,49,3, now()-interval '30 days', now()-interval '30 days', now()-interval '30 days'),
 ('d5000000-0000-4000-a000-000000000024','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000015','Healthcare policy tracker','Reading tracker on drug-pricing and reimbursement policy.','Policy tracker for healthcare (IRA drug pricing, reimbursement).','LLY','Healthcare','{policy,reading}','org','c16275b2-42eb-410a-89d7-758788c08fdc','reading','published',1,NULL,'Fall 2026','Analyst — Healthcare',false,false,NULL,61,5, now()-interval '25 days', now()-interval '25 days', now()-interval '25 days'),
 ('d5000000-0000-4000-a000-000000000025','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000012','ISRG — dV5 upgrade-cycle note','Note on the da Vinci 5 upgrade cycle.','Intuitive dV5 restarts the installed-base upgrade cycle.','ISRG','Healthcare','{medtech}','org','c16275b2-42eb-410a-89d7-758788c08fdc','note','published',1,NULL,'Fall 2026','Senior Analyst — Healthcare',false,false,'d4000000-0000-4000-a000-000000000006',57,4, now()-interval '30 days', now()-interval '30 days', now()-interval '30 days'),
 ('d5000000-0000-4000-a000-000000000026','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000016','CMG — throughput + unit growth memo','Pitch memo for Chipotle.','Chipotle throughput and unit growth compound AUVs over a long runway.','CMG','Consumer','{restaurants}','org','c8880eae-61a7-441e-849c-11624cb6be49','pitch_memo','published',1,NULL,'Fall 2026','Analyst — Consumer',false,false,'d4000000-0000-4000-a000-000000000005',73,9, now()-interval '40 days', now()-interval '45 days', now()-interval '40 days'),
 ('d5000000-0000-4000-a000-000000000027','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000016','NKE — short thesis note','Note supporting the Nike short.','Nike brand heat fading; wholesale reset drags revenue and margin.','NKE','Consumer','{short,apparel}','org','c8880eae-61a7-441e-849c-11624cb6be49','note','published',1,NULL,'Fall 2026','Analyst — Consumer',false,false,'d4000000-0000-4000-a000-000000000010',66,5, now()-interval '34 days', now()-interval '44 days', now()-interval '34 days'),
 ('d5000000-0000-4000-a000-000000000028','84c0372a-6b0a-4126-963e-9b0aa6660570','e9a6277b-7cc2-4395-b85b-6de8ddbada83','IC minutes — SBUX rejection','Minutes from the IC session that rejected SBUX.','Committee minutes: SBUX passed; watchlist instead.','SBUX','Consumer','{minutes,ic}','org',NULL,'ic_minutes','published',1,NULL,'Fall 2026','President & CIO',false,false,'d4000000-0000-4000-a000-000000000016',84,6, now()-interval '20 days', now()-interval '20 days', now()-interval '20 days'),
 ('d5000000-0000-4000-a000-000000000029','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000012','ABBV — immunology base note','Note on the AbbVie immunology franchise.','AbbVie Skyrizi/Rinvoq out-grow Humira erosion faster than modeled.','ABBV','Healthcare','{pharma}','org','c16275b2-42eb-410a-89d7-758788c08fdc','note','published',1,NULL,'Fall 2026','Senior Analyst — Healthcare',false,false,'d4000000-0000-4000-a000-000000000018',59,4, now()-interval '70 days', now()-interval '75 days', now()-interval '70 days'),
 ('d5000000-0000-4000-a000-000000000030','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000007','Consumer sleeve — draft','Draft sleeve positioning; not published.','Draft consumer sleeve positioning note.','CMG','Consumer','{sleeve,draft}','private','c8880eae-61a7-441e-849c-11624cb6be49','note','draft',1,NULL,'Fall 2026','Consumer PM',false,false,NULL,2,0,NULL, now()-interval '5 days', now()-interval '5 days'),
 ('d5000000-0000-4000-a000-000000000031','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000011','Semis supply-chain primer','Primer on the semiconductor supply chain.','Reference primer on the semis supply chain for the TMT desk.','AMD','TMT','{primer,semis}','org','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','primer','published',1,NULL,'Fall 2026','Senior Analyst — TMT',false,false,NULL,90,10, now()-interval '50 days', now()-interval '52 days', now()-interval '50 days'),
 ('d5000000-0000-4000-a000-000000000032','84c0372a-6b0a-4126-963e-9b0aa6660570','72a333c0-bf84-432c-be9f-fad56670dd13','Macro — rates and equity multiples','Reading on how the rate path maps to equity multiples.','Macro reading: rate path and its effect on equity multiples.',NULL,'Macro','{macro,reading}','org',NULL,'reading','published',1,NULL,'Fall 2026','Vice President',false,false,NULL,102,7, now()-interval '15 days', now()-interval '15 days', now()-interval '15 days'),
 ('d5000000-0000-4000-a000-000000000033','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000018','PLTR — AIP land-and-expand note','Trainee working note on Palantir.','Palantir AIP bootcamps convert to seat expansion faster than skeptics assume.','PLTR','TMT','{software,trainee}','team','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','note','published',1,NULL,'Fall 2026','Trainee Analyst — TMT',false,false,'d4000000-0000-4000-a000-000000000002',28,1, now()-interval '12 days', now()-interval '12 days', now()-interval '12 days'),
 ('d5000000-0000-4000-a000-000000000034','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000020','Alumni retro — the 2024 book','Alumni retrospective on the 2024 portfolio and lessons for the current class.','Alum-authored retrospective on the 2024 book; teaching artifact.',NULL,'General','{retro,alumni}','org',NULL,'post_mortem','published',1,NULL,'Spring 2025','Senior Analyst',true,true,NULL,133,19, now()-interval '300 days', now()-interval '305 days', now()-interval '300 days')
ON CONFLICT (id) DO NOTHING;

-- ── 6a. Research VERSION history (makes the superseded chain real) ───────────
INSERT INTO public.org_research_versions (id, note_id, org_id, version, title, body, abstract, edited_by, created_at) VALUES
 ('d5a00000-0000-4000-a000-000000000201','d5000000-0000-4000-a000-000000000021','84c0372a-6b0a-4126-963e-9b0aa6660570',1,'Energy sleeve view — Q1','Original Q1 positioning.','Q1 energy sleeve view.','d0000000-0000-4000-a000-000000000008', now()-interval '125 days'),
 ('d5a00000-0000-4000-a000-000000000202','d5000000-0000-4000-a000-000000000021','84c0372a-6b0a-4126-963e-9b0aa6660570',2,'Energy sleeve view — Q2 (v2)','Updated: trim crude beta, add renewables optionality.','Q2 energy sleeve view (v2).','d0000000-0000-4000-a000-000000000008', now()-interval '90 days'),
 ('d5a00000-0000-4000-a000-000000000011','d5000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570',1,'MSFT — Copilot monetization deep dive','Initial published version.','Copilot + Azure AI thesis.','b0a9a9d4-54a2-4461-a203-95d869dae6c1', now()-interval '30 days')
ON CONFLICT (id) DO NOTHING;

-- ── 6b. Research COMMENTS (incl. a review block) ────────────────────────────
INSERT INTO public.org_research_comments (id, note_id, org_id, author_id, body, anchor, is_review_block, resolved, created_at) VALUES
 ('d5b00000-0000-4000-a000-000000000061','d5000000-0000-4000-a000-000000000006','84c0372a-6b0a-4126-963e-9b0aa6660570','b0a9a9d4-54a2-4461-a203-95d869dae6c1','Add a bear case on Data Cloud attach before we publish.','Valuation',true,false, now()-interval '4 days'),
 ('d5b00000-0000-4000-a000-000000000062','d5000000-0000-4000-a000-000000000006','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000011','Added — see the revised sensitivity table.','Valuation',false,true, now()-interval '3 days'),
 ('d5b00000-0000-4000-a000-000000000071','d5000000-0000-4000-a000-000000000007','84c0372a-6b0a-4126-963e-9b0aa6660570','e9a6277b-7cc2-4395-b85b-6de8ddbada83','Great, honest retro. This should go in the Learning Center.',NULL,false,true, now()-interval '19 days')
ON CONFLICT (id) DO NOTHING;

-- ── 6c. Research TEMPLATES ──────────────────────────────────────────────────
INSERT INTO public.org_research_templates (id, org_id, name, doc_type, required_sections, body_scaffold, created_by, created_at) VALUES
 ('d5c00000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','Standard pitch memo','pitch_memo','["thesis","variant_perception","valuation","catalysts","risks"]'::jsonb,'## Thesis\n\n## Variant perception\n\n## Valuation\n\n## Catalysts\n\n## Risks','e9a6277b-7cc2-4395-b85b-6de8ddbada83', now()-interval '200 days'),
 ('d5c00000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','Model documentation','model','["assumptions","drivers","scenarios","sensitivities"]'::jsonb,'## Assumptions\n\n## Key drivers\n\n## Scenarios\n\n## Sensitivities','b0a9a9d4-54a2-4461-a203-95d869dae6c1', now()-interval '200 days'),
 ('d5c00000-0000-4000-a000-000000000003','84c0372a-6b0a-4126-963e-9b0aa6660570','Post-mortem','post_mortem','["what_we_believed","what_happened","what_we_learned"]'::jsonb,'## What we believed\n\n## What happened\n\n## What we learned','e9a6277b-7cc2-4395-b85b-6de8ddbada83', now()-interval '180 days')
ON CONFLICT (id) DO NOTHING;

-- ── 6d. Research COLLECTIONS (saved searches + pinned sets) ──────────────────
INSERT INTO public.org_research_collections (id, org_id, owner_id, name, kind, query, note_ids, created_at) VALUES
 ('d5d00000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','b0a9a9d4-54a2-4461-a203-95d869dae6c1','TMT exemplars','collection',NULL, ARRAY['d5000000-0000-4000-a000-000000000001','d5000000-0000-4000-a000-000000000007']::uuid[], now()-interval '20 days'),
 ('d5d00000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','e9a6277b-7cc2-4395-b85b-6de8ddbada83','All post-mortems','saved_search','{"doc_type":"post_mortem"}'::jsonb, '{}'::uuid[], now()-interval '18 days'),
 ('d5d00000-0000-4000-a000-000000000003','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000005','Healthcare desk reading','collection',NULL, ARRAY['d5000000-0000-4000-a000-000000000004','d5000000-0000-4000-a000-000000000024']::uuid[], now()-interval '15 days')
ON CONFLICT (id) DO NOTHING;

-- ── 6e. COVERAGE LINEAGE (analyst→analyst handoffs; one STALE >90 days) ──────
INSERT INTO public.org_coverage_lineage (id, org_id, ticker, from_member_id, to_member_id, handoff_note_id, term, created_at) VALUES
 ('d5e00000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','MSFT','d1000000-0000-4000-a000-000000000011','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','d5000000-0000-4000-a000-000000000001','Fall 2026', now()-interval '30 days'),
 ('d5e00000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','LLY','d1000000-0000-4000-a000-000000000015','d1000000-0000-4000-a000-000000000012','d5000000-0000-4000-a000-000000000003','Fall 2026', now()-interval '20 days'),
 ('d5e00000-0000-4000-a000-000000000003','84c0372a-6b0a-4126-963e-9b0aa6660570','V','d1000000-0000-4000-a000-000000000006','d1000000-0000-4000-a000-000000000013','d5000000-0000-4000-a000-000000000011','Fall 2026', now()-interval '25 days'),
 -- STALE handoff (>90 days since last update → stale-coverage flag fires):
 ('d5e00000-0000-4000-a000-000000000004','84c0372a-6b0a-4126-963e-9b0aa6660570','XOM','d1000000-0000-4000-a000-000000000008','d1000000-0000-4000-a000-000000000014','d5000000-0000-4000-a000-000000000021','Spring 2026', now()-interval '120 days'),
 ('d5e00000-0000-4000-a000-000000000005','84c0372a-6b0a-4126-963e-9b0aa6660570','FCX','d1000000-0000-4000-a000-000000000010','d1000000-0000-4000-a000-000000000019','d5000000-0000-4000-a000-000000000022','Fall 2026', now()-interval '40 days'),
 ('d5e00000-0000-4000-a000-000000000006','84c0372a-6b0a-4126-963e-9b0aa6660570','CAT','d1000000-0000-4000-a000-000000000009','d1000000-0000-4000-a000-000000000017','d5000000-0000-4000-a000-000000000015','Fall 2026', now()-interval '15 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. MEETINGS — 12 sessions (7 past-with-sentiment, 2 in the analysis queue,
--    3 upcoming). status: scheduled=upcoming, closed=past (the app maps closed
--    to "Completed"). Recorder integrations are intentionally left EMPTY below.
-- ============================================================================
INSERT INTO public.org_meetings
 (id, org_id, title, status, category, team_id, started_by, scheduled_at, started_at, ended_at, closed_at,
  location, quorum_pct, recording_url, recording_source, transcript, ai_summary, analysis_status, pitch_id, agenda, minutes, created_at) VALUES
 ('d6000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','Investment Committee — MSFT vote','closed','ic',NULL,'e9a6277b-7cc2-4395-b85b-6de8ddbada83', now()-interval '10 days', now()-interval '10 days', now()-interval '10 days'+interval '90 minutes', now()-interval '10 days'+interval '90 minutes','Finance Lab 204',60,'seed://recordings/ic-msft.mp4','upload','MSFT committee transcript — full discussion of Copilot monetization and Azure reacceleration...','AI summary: Committee approved MSFT as a core holding. Strong consensus on Azure; minor debate on AI capex digestion.','ready','d4000000-0000-4000-a000-000000000015','[{"n":1,"item":"MSFT pitch","owner":"Noah Asheber","mins":25},{"n":2,"item":"Q&A","owner":"Committee","mins":20},{"n":3,"item":"Blind ballot","owner":"President","mins":10}]'::jsonb,'[]'::jsonb, now()-interval '14 days'),
 ('d6000000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','TMT desk weekly','closed','sector','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','b0a9a9d4-54a2-4461-a203-95d869dae6c1', now()-interval '7 days', now()-interval '7 days', now()-interval '7 days'+interval '60 minutes', now()-interval '7 days'+interval '60 minutes','Room 110',50,'seed://recordings/tmt-wk.mp4','zoom','TMT weekly transcript...','AI summary: CRM model reviewed; AMD idea greenlit for research.','ready',NULL,'[{"n":1,"item":"Coverage updates","owner":"Desk","mins":20},{"n":2,"item":"CRM model review","owner":"Jordan Blake","mins":25}]'::jsonb,'[]'::jsonb, now()-interval '9 days'),
 ('d6000000-0000-4000-a000-000000000003','84c0372a-6b0a-4126-963e-9b0aa6660570','Healthcare desk weekly','closed','sector','c16275b2-42eb-410a-89d7-758788c08fdc','d0000000-0000-4000-a000-000000000005', now()-interval '8 days', now()-interval '8 days', now()-interval '8 days'+interval '55 minutes', now()-interval '8 days'+interval '55 minutes','Room 112',50,NULL,'otter','Healthcare weekly transcript...','AI summary: LLY ready for IC; ISRG deep dive continues.','ready',NULL,'[{"n":1,"item":"LLY IC prep","owner":"Mei Lin","mins":30}]'::jsonb,'[]'::jsonb, now()-interval '10 days'),
 ('d6000000-0000-4000-a000-000000000004','84c0372a-6b0a-4126-963e-9b0aa6660570','All-hands portfolio review','closed','general',NULL,'e9a6277b-7cc2-4395-b85b-6de8ddbada83', now()-interval '14 days', now()-interval '14 days', now()-interval '14 days'+interval '75 minutes', now()-interval '14 days'+interval '75 minutes','Auditorium',50,'seed://recordings/allhands.mp4','fireflies','All-hands transcript...','AI summary: Fund up vs benchmark; risk review flagged energy sleeve beta.','ready',NULL,'[{"n":1,"item":"Performance","owner":"CIO","mins":20},{"n":2,"item":"Risk review","owner":"VP","mins":20}]'::jsonb,'[]'::jsonb, now()-interval '16 days'),
 ('d6000000-0000-4000-a000-000000000005','84c0372a-6b0a-4126-963e-9b0aa6660570','Exec committee — capital allocation','closed','exec','5d5e0da7-0c69-47ba-ab1f-303df8ac0385','e9a6277b-7cc2-4395-b85b-6de8ddbada83', now()-interval '21 days', now()-interval '21 days', now()-interval '21 days'+interval '45 minutes', now()-interval '21 days'+interval '45 minutes','Boardroom',50,NULL,'upload','Exec transcript...','AI summary: Approved cash-sleeve deployment plan; sized MSFT.','ready',NULL,'[{"n":1,"item":"Cash deployment","owner":"CIO","mins":25}]'::jsonb,'[]'::jsonb, now()-interval '23 days'),
 ('d6000000-0000-4000-a000-000000000006','84c0372a-6b0a-4126-963e-9b0aa6660570','Education — DCF workshop','closed','education',NULL,'d0000000-0000-4000-a000-000000000006', now()-interval '18 days', now()-interval '18 days', now()-interval '18 days'+interval '80 minutes', now()-interval '18 days'+interval '80 minutes','Room 110',0,'seed://recordings/dcf.mp4','read_ai','Workshop transcript...','AI summary: DCF fundamentals for trainees; strong engagement.','ready',NULL,'[{"n":1,"item":"DCF walkthrough","owner":"David Okonkwo","mins":60}]'::jsonb,'[]'::jsonb, now()-interval '20 days'),
 ('d6000000-0000-4000-a000-000000000007','84c0372a-6b0a-4126-963e-9b0aa6660570','Financials desk weekly','closed','sector','73da53d7-676b-419a-a20b-f1a728c92fe7','d0000000-0000-4000-a000-000000000006', now()-interval '11 days', now()-interval '11 days', now()-interval '11 days'+interval '50 minutes', now()-interval '11 days'+interval '50 minutes','Room 114',50,NULL,'zoom','Financials weekly transcript...','AI summary: V and MA models refined; GS thesis progressing.','ready',NULL,'[{"n":1,"item":"V/MA review","owner":"Carlos Mendes","mins":30}]'::jsonb,'[]'::jsonb, now()-interval '13 days'),
 ('d6000000-0000-4000-a000-000000000008','84c0372a-6b0a-4126-963e-9b0aa6660570','Consumer desk weekly','closed','sector','c8880eae-61a7-441e-849c-11624cb6be49','d0000000-0000-4000-a000-000000000007', now()-interval '2 days', now()-interval '2 days', now()-interval '2 days'+interval '50 minutes', now()-interval '2 days'+interval '50 minutes','Room 116',50,'seed://recordings/consumer-wk.mp4','otter','Consumer weekly transcript (processing)...',NULL,'analyzing',NULL,'[{"n":1,"item":"CMG + NKE","owner":"Omar Haddad","mins":30}]'::jsonb,'[]'::jsonb, now()-interval '3 days'),
 ('d6000000-0000-4000-a000-000000000009','84c0372a-6b0a-4126-963e-9b0aa6660570','Energy desk weekly','closed','sector','76a5af44-191c-422b-b428-17803eb799bd','d0000000-0000-4000-a000-000000000008', now()-interval '1 day', now()-interval '1 day', now()-interval '1 day'+interval '45 minutes', now()-interval '1 day'+interval '45 minutes','Room 118',50,'seed://recordings/energy-wk.mp4','fireflies',NULL,NULL,'transcribing',NULL,'[{"n":1,"item":"FSLR + ENPH","owner":"Fatima Al-Sayed","mins":30}]'::jsonb,'[]'::jsonb, now()-interval '2 days'),
 ('d6000000-0000-4000-a000-000000000010','84c0372a-6b0a-4126-963e-9b0aa6660570','Investment Committee — LLY & V','scheduled','ic',NULL,'e9a6277b-7cc2-4395-b85b-6de8ddbada83', now()+interval '5 days',NULL,NULL,NULL,'Finance Lab 204',60,NULL,NULL,NULL,NULL,'none',NULL,'[{"n":1,"item":"LLY pitch","owner":"Mei Lin","mins":25},{"n":2,"item":"V pitch","owner":"Carlos Mendes","mins":25},{"n":3,"item":"Blind ballots","owner":"President","mins":15}]'::jsonb,'[]'::jsonb, now()-interval '3 days'),
 ('d6000000-0000-4000-a000-000000000011','84c0372a-6b0a-4126-963e-9b0aa6660570','TMT desk weekly','scheduled','sector','7bbf14b0-64ef-4a29-a10d-e0e1e9c0abc9','b0a9a9d4-54a2-4461-a203-95d869dae6c1', now()+interval '2 days',NULL,NULL,NULL,'Room 110',50,NULL,NULL,NULL,NULL,'none',NULL,'[{"n":1,"item":"AMD research kickoff","owner":"Blackberry Analyst","mins":30}]'::jsonb,'[]'::jsonb, now()-interval '1 day'),
 ('d6000000-0000-4000-a000-000000000012','84c0372a-6b0a-4126-963e-9b0aa6660570','Education — comps & multiples','scheduled','education',NULL,'d0000000-0000-4000-a000-000000000005', now()+interval '9 days',NULL,NULL,NULL,'Room 112',0,NULL,NULL,NULL,NULL,'none',NULL,'[{"n":1,"item":"Relative valuation","owner":"Aisha Patel","mins":60}]'::jsonb,'[]'::jsonb, now()-interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ── 7a. Meeting ATTENDEES — mixed RSVP (upcoming) + attendance (past) ───────
INSERT INTO public.org_meeting_attendees (id, meeting_id, org_id, member_id, rsvp, attended, created_at) VALUES
 -- Past IC (M01): attendance recorded
 ('d6a00000-0000-4000-a000-000000000101','d6000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','e8e3758f-9a71-4efb-9532-228ae257d09e','yes',true, now()-interval '11 days'),
 ('d6a00000-0000-4000-a000-000000000102','d6000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','1ff8ab9a-1c40-4b38-9812-e28ce7a151a3','yes',true, now()-interval '11 days'),
 ('d6a00000-0000-4000-a000-000000000103','d6000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','yes',true, now()-interval '11 days'),
 ('d6a00000-0000-4000-a000-000000000104','d6000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000005','yes',true, now()-interval '11 days'),
 ('d6a00000-0000-4000-a000-000000000105','d6000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000006','yes',false, now()-interval '11 days'),
 -- Upcoming IC (M10): mixed RSVP, quorum in question
 ('d6a00000-0000-4000-a000-000000000201','d6000000-0000-4000-a000-000000000010','84c0372a-6b0a-4126-963e-9b0aa6660570','e8e3758f-9a71-4efb-9532-228ae257d09e','yes',NULL, now()-interval '3 days'),
 ('d6a00000-0000-4000-a000-000000000202','d6000000-0000-4000-a000-000000000010','84c0372a-6b0a-4126-963e-9b0aa6660570','1ff8ab9a-1c40-4b38-9812-e28ce7a151a3','yes',NULL, now()-interval '3 days'),
 ('d6a00000-0000-4000-a000-000000000203','d6000000-0000-4000-a000-000000000010','84c0372a-6b0a-4126-963e-9b0aa6660570','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','maybe',NULL, now()-interval '3 days'),
 ('d6a00000-0000-4000-a000-000000000204','d6000000-0000-4000-a000-000000000010','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000005','yes',NULL, now()-interval '3 days'),
 ('d6a00000-0000-4000-a000-000000000205','d6000000-0000-4000-a000-000000000010','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000006','no',NULL, now()-interval '3 days'),
 ('d6a00000-0000-4000-a000-000000000206','d6000000-0000-4000-a000-000000000010','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000007','pending',NULL, now()-interval '3 days'),
 ('d6a00000-0000-4000-a000-000000000207','d6000000-0000-4000-a000-000000000010','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000008','maybe',NULL, now()-interval '3 days'),
 -- TMT weekly (M02) sample attendance
 ('d6a00000-0000-4000-a000-000000000301','d6000000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','yes',true, now()-interval '8 days'),
 ('d6a00000-0000-4000-a000-000000000302','d6000000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000011','yes',true, now()-interval '8 days'),
 ('d6a00000-0000-4000-a000-000000000303','d6000000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','fc2ca48d-c5c4-4713-a156-4c43d0394175','yes',true, now()-interval '8 days'),
 ('d6a00000-0000-4000-a000-000000000304','d6000000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000018','maybe',false, now()-interval '8 days')
ON CONFLICT (id) DO NOTHING;

-- ── 7b. Meeting SENTIMENT by tier (7 past sessions → full trend series) ─────
INSERT INTO public.org_meeting_sentiment (id, meeting_id, org_id, tier, score, created_at)
SELECT
  md5('sent:'||m.mid||':'||t.tier)::uuid,
  m.mid::uuid,'84c0372a-6b0a-4126-963e-9b0aa6660570', t.tier, t.score, now()-interval '6 days'
FROM (VALUES
  ('d6000000-0000-4000-a000-000000000001', 0.62, 0.55, 0.48),
  ('d6000000-0000-4000-a000-000000000002', 0.40, 0.35, 0.28),
  ('d6000000-0000-4000-a000-000000000003', 0.55, 0.50, 0.42),
  ('d6000000-0000-4000-a000-000000000004', 0.30, 0.22, 0.10),
  ('d6000000-0000-4000-a000-000000000005', 0.48, 0.44, 0.30),
  ('d6000000-0000-4000-a000-000000000006', 0.70, 0.66, 0.72),
  ('d6000000-0000-4000-a000-000000000007', 0.33, 0.28, 0.15)
) AS m(mid, exec_s, pm_s, an_s)
CROSS JOIN LATERAL (VALUES
  ('exec', m.exec_s),('portfolio_manager', m.pm_s),('analyst', m.an_s)
) AS t(tier, score)
ON CONFLICT (id) DO NOTHING;

-- ── 7c. Meeting DELIVERABLES discussed ──────────────────────────────────────
INSERT INTO public.org_meeting_deliverables (id, meeting_id, org_id, kind, label, note_id, created_at) VALUES
 ('d6c00000-0000-4000-a000-000000000011','d6000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','deck','MSFT IC deck',NULL, now()-interval '10 days'),
 ('d6c00000-0000-4000-a000-000000000012','d6000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','memo','MSFT pitch memo','d5000000-0000-4000-a000-000000000001', now()-interval '10 days'),
 ('d6c00000-0000-4000-a000-000000000021','d6000000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','model','CRM DCF',NULL, now()-interval '7 days'),
 ('d6c00000-0000-4000-a000-000000000041','d6000000-0000-4000-a000-000000000004','84c0372a-6b0a-4126-963e-9b0aa6660570','report','Quarterly performance report',NULL, now()-interval '14 days'),
 ('d6c00000-0000-4000-a000-000000000071','d6000000-0000-4000-a000-000000000007','84c0372a-6b0a-4126-963e-9b0aa6660570','model','V network model','d5000000-0000-4000-a000-000000000011', now()-interval '11 days')
ON CONFLICT (id) DO NOTHING;

-- ── 7d. Meeting VOTES — the IC live vote (buy/pass/abstain), one per member ──
INSERT INTO public.org_meeting_votes (id, meeting_id, org_id, voter_member_id, vote, created_at) VALUES
 ('d6d00000-0000-4000-a000-000000000101','d6000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','e8e3758f-9a71-4efb-9532-228ae257d09e','buy', now()-interval '10 days'),
 ('d6d00000-0000-4000-a000-000000000102','d6000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','1ff8ab9a-1c40-4b38-9812-e28ce7a151a3','buy', now()-interval '10 days'),
 ('d6d00000-0000-4000-a000-000000000103','d6000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','buy', now()-interval '10 days'),
 ('d6d00000-0000-4000-a000-000000000104','d6000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000005','buy', now()-interval '10 days'),
 ('d6d00000-0000-4000-a000-000000000105','d6000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000007','pass', now()-interval '10 days'),
 ('d6d00000-0000-4000-a000-000000000106','d6000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000009','abstain', now()-interval '10 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. ASSIGNMENTS — templates first (FK), then 22 assignments across every
--    status & type (incl. overdue = past due + not complete/graded), multi-
--    assignee targeting (all 5 target types), the review loop, and onboarding.
-- ============================================================================
INSERT INTO public.org_assignment_templates (id, org_id, name, assignment_type, title, instructions, sector, require_upload, created_by, created_at) VALUES
 ('d7d00000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','Sector pitch','pitch','Pitch a name in your sector','Full memo + model + 10-slide deck. Include variant perception and risks.',NULL,true,'e9a6277b-7cc2-4395-b85b-6de8ddbada83', now()-interval '200 days'),
 ('d7d00000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','Weekly coverage update','coverage','Update your coverage','One-paragraph update per covered name; flag thesis changes.',NULL,false,'e9a6277b-7cc2-4395-b85b-6de8ddbada83', now()-interval '200 days'),
 ('d7d00000-0000-4000-a000-000000000003','84c0372a-6b0a-4126-963e-9b0aa6660570','Onboarding — build a DCF','model','Build a DCF for an assigned name','Follow the DCF workshop; submit the model workbook.',NULL,true,'d0000000-0000-4000-a000-000000000006', now()-interval '120 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.org_assignments
 (id, org_id, cohort_id, assigned_to, assigned_by, title, description, instructions, assignment_type, status,
  ticker, sector, due_date, progress_pct, require_upload, template_id, rubric_max, rubric_score, rubric_comment, created_at) VALUES
 ('d7000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','9e1f95d9-5978-442a-abdd-588482f94575','c45adbae-9cce-4508-9a1e-62a78efdc4b5','b0a9a9d4-54a2-4461-a203-95d869dae6c1','Pitch a TMT name','Semiconductor or software.','Full memo + model + deck.','pitch','assigned',NULL,'TMT', now()+interval '7 days',0,true,'d7d00000-0000-4000-a000-000000000001',NULL,NULL,NULL, now()-interval '3 days'),
 ('d7000000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','9e1f95d9-5978-442a-abdd-588482f94575','d0000000-0000-4000-a000-000000000011','b0a9a9d4-54a2-4461-a203-95d869dae6c1','CRM deep dive','Complete the FCF bridge.','Sensitize Data Cloud attach.','research','in_progress','CRM','TMT', now()+interval '3 days',55,false,NULL,NULL,NULL,NULL, now()-interval '8 days'),
 ('d7000000-0000-4000-a000-000000000003','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','d0000000-0000-4000-a000-000000000013','d0000000-0000-4000-a000-000000000006','V model','Finalize the network model.','Submit workbook.','model','submitted','V','Financials', now()+interval '1 day',100,true,NULL,NULL,NULL,NULL, now()-interval '10 days'),
 ('d7000000-0000-4000-a000-000000000004','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','d0000000-0000-4000-a000-000000000017','d0000000-0000-4000-a000-000000000009','Industrials coverage','Update DE, CAT, GE.','One paragraph each.','coverage','under_review',NULL,'Industrials', now()+interval '5 days',90,false,'d7d00000-0000-4000-a000-000000000002',NULL,NULL,NULL, now()-interval '6 days'),
 ('d7000000-0000-4000-a000-000000000005','84c0372a-6b0a-4126-963e-9b0aa6660570','9e1f95d9-5978-442a-abdd-588482f94575','d0000000-0000-4000-a000-000000000015','d0000000-0000-4000-a000-000000000005','Read: healthcare policy','Read the policy tracker.','Summarize key takeaways.','reading','complete','LLY','Healthcare', now()-interval '10 days',100,false,NULL,NULL,NULL,NULL, now()-interval '20 days'),
 ('d7000000-0000-4000-a000-000000000006','84c0372a-6b0a-4126-963e-9b0aa6660570','9e1f95d9-5978-442a-abdd-588482f94575','d0000000-0000-4000-a000-000000000012','d0000000-0000-4000-a000-000000000005','LLY IC prep','Prep the committee deck.','Rehearse Q&A.','meeting_prep','graded','LLY','Healthcare', now()-interval '8 days',100,true,NULL,20,18,'Excellent prep; tighten the risk slide.', now()-interval '18 days'),
 ('d7000000-0000-4000-a000-000000000007','84c0372a-6b0a-4126-963e-9b0aa6660570','9e1f95d9-5978-442a-abdd-588482f94575','d0000000-0000-4000-a000-000000000016','d0000000-0000-4000-a000-000000000007','CMG research','Verify unit-economics assumptions.','Cite sources.','research','returned','CMG','Consumer', now()+interval '2 days',60,false,NULL,NULL,NULL,NULL, now()-interval '12 days'),
 ('d7000000-0000-4000-a000-000000000008','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','d0000000-0000-4000-a000-000000000014','d0000000-0000-4000-a000-000000000008','FSLR pitch','Finish the pitch.','Memo + model.','pitch','in_progress','FSLR','Energy', now()-interval '3 days',70,true,'d7d00000-0000-4000-a000-000000000001',NULL,NULL,NULL, now()-interval '15 days'),
 ('d7000000-0000-4000-a000-000000000009','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','d0000000-0000-4000-a000-000000000018','d0000000-0000-4000-a000-000000000011','Onboarding read: pitch process','Read the fund pitch guide.','Acknowledge completion.','reading','assigned',NULL,NULL, now()-interval '2 days',0,false,NULL,NULL,NULL,NULL, now()-interval '20 days'),
 ('d7000000-0000-4000-a000-000000000010','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','d0000000-0000-4000-a000-000000000019','d0000000-0000-4000-a000-000000000010','Onboarding: intro survey','Complete the intro survey.','Tell us your sector interests.','other','assigned',NULL,NULL, now()+interval '10 days',0,false,NULL,NULL,NULL,NULL, now()-interval '20 days'),
 ('d7000000-0000-4000-a000-000000000011','84c0372a-6b0a-4126-963e-9b0aa6660570','9e1f95d9-5978-442a-abdd-588482f94575','d0000000-0000-4000-a000-000000000015','d0000000-0000-4000-a000-000000000005','ISRG model','Build the procedure-growth model.','Use the model template.','model','in_progress','ISRG','Healthcare', now()+interval '6 days',35,true,'d7d00000-0000-4000-a000-000000000003',NULL,NULL,NULL, now()-interval '7 days'),
 ('d7000000-0000-4000-a000-000000000012','84c0372a-6b0a-4126-963e-9b0aa6660570','9e1f95d9-5978-442a-abdd-588482f94575','d0000000-0000-4000-a000-000000000011','b0a9a9d4-54a2-4461-a203-95d869dae6c1','TMT coverage refresh','Refresh AMD/CRM.','Flag changes.','coverage','complete',NULL,'TMT', now()-interval '15 days',100,false,'d7d00000-0000-4000-a000-000000000002',NULL,NULL,NULL, now()-interval '30 days'),
 ('d7000000-0000-4000-a000-000000000013','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','d0000000-0000-4000-a000-000000000013','d0000000-0000-4000-a000-000000000006','GS research','Trough-wallet analysis.','Peer comps.','research','graded','GS','Financials', now()-interval '20 days',100,false,NULL,20,16,'Solid; deepen the buyback math.', now()-interval '35 days'),
 ('d7000000-0000-4000-a000-000000000014','84c0372a-6b0a-4126-963e-9b0aa6660570','9e1f95d9-5978-442a-abdd-588482f94575','c45adbae-9cce-4508-9a1e-62a78efdc4b5','b0a9a9d4-54a2-4461-a203-95d869dae6c1','AMD memo','Draft the memo.','Follow the pitch template.','pitch','submitted','AMD','TMT', now()+interval '1 day',100,true,'d7d00000-0000-4000-a000-000000000001',NULL,NULL,NULL, now()-interval '9 days'),
 ('d7000000-0000-4000-a000-000000000015','84c0372a-6b0a-4126-963e-9b0aa6660570','9e1f95d9-5978-442a-abdd-588482f94575','d0000000-0000-4000-a000-000000000005','e9a6277b-7cc2-4395-b85b-6de8ddbada83','Healthcare desk prep','Prep the desk weekly.','Agenda + coverage.','meeting_prep','assigned',NULL,'Healthcare', now()+interval '4 days',0,false,NULL,NULL,NULL,NULL, now()-interval '2 days'),
 ('d7000000-0000-4000-a000-000000000016','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','d0000000-0000-4000-a000-000000000016','d0000000-0000-4000-a000-000000000007','Read: restaurant unit economics','Read the primer.','Summarize.','reading','in_progress','CMG','Consumer', now()-interval '4 days',40,false,NULL,NULL,NULL,NULL, now()-interval '12 days'),
 ('d7000000-0000-4000-a000-000000000017','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','d0000000-0000-4000-a000-000000000014','d0000000-0000-4000-a000-000000000008','ENPH model','Short model build.','Downside scenarios.','model','under_review','ENPH','Energy', now()+interval '3 days',85,true,'d7d00000-0000-4000-a000-000000000003',NULL,NULL,NULL, now()-interval '6 days'),
 ('d7000000-0000-4000-a000-000000000018','84c0372a-6b0a-4126-963e-9b0aa6660570','9e1f95d9-5978-442a-abdd-588482f94575','d0000000-0000-4000-a000-000000000012','d0000000-0000-4000-a000-000000000005','ABBV research','Immunology base-rate work.','Script trends.','research','complete','ABBV','Healthcare', now()-interval '25 days',100,false,NULL,NULL,NULL,NULL, now()-interval '40 days'),
 ('d7000000-0000-4000-a000-000000000019','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','d0000000-0000-4000-a000-000000000017','d0000000-0000-4000-a000-000000000009','CAT coverage','Backlog conversion tracker.','Update weekly.','coverage','assigned','CAT','Industrials', now()+interval '8 days',0,false,'d7d00000-0000-4000-a000-000000000002',NULL,NULL,NULL, now()-interval '1 day'),
 ('d7000000-0000-4000-a000-000000000020','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','d0000000-0000-4000-a000-000000000018','d0000000-0000-4000-a000-000000000011','Shadow a senior analyst','Sit in on TMT coverage.','Write up learnings.','other','in_progress',NULL,'TMT', now()+interval '5 days',50,false,NULL,NULL,NULL,NULL, now()-interval '10 days'),
 ('d7000000-0000-4000-a000-000000000021','84c0372a-6b0a-4126-963e-9b0aa6660570','9e1f95d9-5978-442a-abdd-588482f94575','b0a9a9d4-54a2-4461-a203-95d869dae6c1','e9a6277b-7cc2-4395-b85b-6de8ddbada83','MSFT post-decision review','Write the position-open memo.','Monitoring plan.','research','graded','MSFT','TMT', now()-interval '30 days',100,true,NULL,20,19,'Exemplary — used as the desk standard.', now()-interval '45 days'),
 ('d7000000-0000-4000-a000-000000000022','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','d0000000-0000-4000-a000-000000000019','d0000000-0000-4000-a000-000000000010','Onboarding: build a DCF','Build a DCF for FCX.','Use the workshop template.','model','assigned','FCX','Metals & Mining', now()+interval '12 days',0,true,'d7d00000-0000-4000-a000-000000000003',NULL,NULL,NULL, now()-interval '20 days')
ON CONFLICT (id) DO NOTHING;

-- ── 8a. ASSIGNEES — demonstrate ALL FIVE target types ───────────────────────
INSERT INTO public.org_assignment_assignees (id, assignment_id, org_id, target_type, target_id, target_role, created_at) VALUES
 ('d7a00000-0000-4000-a000-000000000001','d7000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','member','fc2ca48d-c5c4-4713-a156-4c43d0394175',NULL, now()-interval '3 days'),
 ('d7a00000-0000-4000-a000-000000000002','d7000000-0000-4000-a000-000000000015','84c0372a-6b0a-4126-963e-9b0aa6660570','team','c16275b2-42eb-410a-89d7-758788c08fdc',NULL, now()-interval '2 days'),
 ('d7a00000-0000-4000-a000-000000000003','d7000000-0000-4000-a000-000000000009','84c0372a-6b0a-4126-963e-9b0aa6660570','cohort','d3000000-0000-4000-a000-000000002027',NULL, now()-interval '20 days'),
 ('d7a00000-0000-4000-a000-000000000004','d7000000-0000-4000-a000-000000000016','84c0372a-6b0a-4126-963e-9b0aa6660570','role',NULL,'Consumer Analyst', now()-interval '12 days'),
 ('d7a00000-0000-4000-a000-000000000005','d7000000-0000-4000-a000-000000000005','84c0372a-6b0a-4126-963e-9b0aa6660570','org',NULL,NULL, now()-interval '20 days')
ON CONFLICT (id) DO NOTHING;

-- ── 8b. SUBMISSIONS — version>1 on the RETURNED assignment (A07) ────────────
INSERT INTO public.org_assignment_submissions (id, assignment_id, org_id, submitted_by, version, note, created_at) VALUES
 ('d7b00000-0000-4000-a000-000000000031','d7000000-0000-4000-a000-000000000003','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000013',1,'V model workbook v1.', now()-interval '2 days'),
 ('d7b00000-0000-4000-a000-000000000141','d7000000-0000-4000-a000-000000000014','84c0372a-6b0a-4126-963e-9b0aa6660570','c45adbae-9cce-4508-9a1e-62a78efdc4b5',1,'AMD memo v1.', now()-interval '1 day'),
 ('d7b00000-0000-4000-a000-000000000071','d7000000-0000-4000-a000-000000000007','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000016',1,'CMG research v1.', now()-interval '6 days'),
 ('d7b00000-0000-4000-a000-000000000072','d7000000-0000-4000-a000-000000000007','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000016',2,'CMG research v2 — addressed the return comments.', now()-interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- ── 8c. COMMENTS — incl. a "return for revision" (is_return=true) ───────────
INSERT INTO public.org_assignment_comments (id, assignment_id, org_id, author_id, body, is_return, created_at) VALUES
 ('d7c00000-0000-4000-a000-000000000071','d7000000-0000-4000-a000-000000000007','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000007','Returning for revision — the AUV assumption needs a source; see comments.',true, now()-interval '5 days'),
 ('d7c00000-0000-4000-a000-000000000072','d7000000-0000-4000-a000-000000000007','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000016','Updated with the 10-K citation and a sensitivity table.',false, now()-interval '2 days'),
 ('d7c00000-0000-4000-a000-000000000041','d7000000-0000-4000-a000-000000000004','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000009','Looks good — one nit on the GE shop-visit cadence.',false, now()-interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- ── 8d. ONBOARDING TASKS — linked to REAL org_assignments rows (incl. the
--    pre-existing "Pitch a Health Care name" assignment). is_gate on the pitch.
INSERT INTO public.org_onboarding_tasks (id, org_id, cohort_id, assignment_id, sort_order, is_gate, created_at) VALUES
 ('d7e00000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','d7000000-0000-4000-a000-000000000009',1,false, now()-interval '20 days'),
 ('d7e00000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','d7000000-0000-4000-a000-000000000010',2,false, now()-interval '20 days'),
 ('d7e00000-0000-4000-a000-000000000003','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','d7000000-0000-4000-a000-000000000022',3,false, now()-interval '20 days'),
 ('d7e00000-0000-4000-a000-000000000004','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','a1d65b54-7bf9-4a9e-a20a-9dbee3ceeaba',4,true, now()-interval '20 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 9. COHORTS / ATS — 28 applicants across all 6 kanban stages + both archive
--    lanes (rejected/declined WITH reasons), into the recruiting Class of 2027.
-- ============================================================================
INSERT INTO public.org_applicants
 (id, org_id, cohort_id, full_name, email, program, year, resume_url, sample_pitch_url, responses, stage, source, rejected_reason, applied_at, provisioned_member_id) VALUES
 -- applied (6)
 ('d8000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Ava Thompson','ava.t@ezanatest.edu','Finance','Sophomore','seed://resumes/01.pdf',NULL,'{"why":"Passionate about equities."}'::jsonb,'applied','career_fair',NULL, now()-interval '9 days',NULL),
 ('d8000000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Ben Carter','ben.c@ezanatest.edu','Economics','Freshman','seed://resumes/02.pdf',NULL,'{"why":"Want to learn valuation."}'::jsonb,'applied','club_email',NULL, now()-interval '8 days',NULL),
 ('d8000000-0000-4000-a000-000000000003','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Chloe Diaz','chloe.d@ezanatest.edu','Accounting','Sophomore',NULL,NULL,'{}'::jsonb,'applied','referral',NULL, now()-interval '8 days',NULL),
 ('d8000000-0000-4000-a000-000000000004','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Dev Patel','dev.p@ezanatest.edu','CompSci','Junior','seed://resumes/04.pdf',NULL,'{"why":"Quant interest."}'::jsonb,'applied','linkedin',NULL, now()-interval '7 days',NULL),
 ('d8000000-0000-4000-a000-000000000005','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Emma Wilson','emma.w@ezanatest.edu','Finance','Sophomore','seed://resumes/05.pdf',NULL,'{}'::jsonb,'applied','professor',NULL, now()-interval '6 days',NULL),
 ('d8000000-0000-4000-a000-000000000006','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Finn Murphy','finn.m@ezanatest.edu','Finance','Freshman',NULL,NULL,'{}'::jsonb,'applied','career_fair',NULL, now()-interval '5 days',NULL),
 -- screened (5)
 ('d8000000-0000-4000-a000-000000000007','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Grace Lee','grace.l@ezanatest.edu','Finance','Junior','seed://resumes/07.pdf',NULL,'{"why":"Prior IB internship."}'::jsonb,'screened','referral',NULL, now()-interval '12 days',NULL),
 ('d8000000-0000-4000-a000-000000000008','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Henry Adams','henry.a@ezanatest.edu','Economics','Sophomore','seed://resumes/08.pdf',NULL,'{}'::jsonb,'screened','club_email',NULL, now()-interval '12 days',NULL),
 ('d8000000-0000-4000-a000-000000000009','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Isla Robinson','isla.r@ezanatest.edu','Finance','Sophomore','seed://resumes/09.pdf',NULL,'{}'::jsonb,'screened','linkedin',NULL, now()-interval '11 days',NULL),
 ('d8000000-0000-4000-a000-000000000010','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Jack Nguyen','jack.n@ezanatest.edu','Math','Junior','seed://resumes/10.pdf',NULL,'{"why":"Options modeling."}'::jsonb,'screened','professor',NULL, now()-interval '11 days',NULL),
 ('d8000000-0000-4000-a000-000000000011','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Kira Novak','kira.n@ezanatest.edu','Finance','Sophomore',NULL,NULL,'{}'::jsonb,'screened','career_fair',NULL, now()-interval '10 days',NULL),
 -- interview (5)
 ('d8000000-0000-4000-a000-000000000012','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Liam Foster','liam.f@ezanatest.edu','Finance','Junior','seed://resumes/12.pdf','seed://pitches/12.pdf','{"pitch":"Long AAPL"}'::jsonb,'interview','referral',NULL, now()-interval '15 days',NULL),
 ('d8000000-0000-4000-a000-000000000013','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Mia Sanchez','mia.s@ezanatest.edu','Economics','Junior','seed://resumes/13.pdf','seed://pitches/13.pdf','{"pitch":"Short PTON"}'::jsonb,'interview','club_email',NULL, now()-interval '15 days',NULL),
 ('d8000000-0000-4000-a000-000000000014','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Noah Kim','noah.k@ezanatest.edu','Finance','Sophomore','seed://resumes/14.pdf','seed://pitches/14.pdf','{"pitch":"Long COST"}'::jsonb,'interview','linkedin',NULL, now()-interval '14 days',NULL),
 ('d8000000-0000-4000-a000-000000000015','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Olivia Brown','olivia.b@ezanatest.edu','Finance','Junior','seed://resumes/15.pdf','seed://pitches/15.pdf','{"pitch":"Long V"}'::jsonb,'interview','professor',NULL, now()-interval '14 days',NULL),
 ('d8000000-0000-4000-a000-000000000016','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Priya Sharma','priya.s@ezanatest.edu','CompSci','Junior','seed://resumes/16.pdf','seed://pitches/16.pdf','{"pitch":"Quant pairs"}'::jsonb,'interview','career_fair',NULL, now()-interval '13 days',NULL),
 -- pitch (4)
 ('d8000000-0000-4000-a000-000000000017','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Quinn Taylor','quinn.t@ezanatest.edu','Finance','Junior','seed://resumes/17.pdf','seed://pitches/17.pdf','{"pitch":"Long MSFT"}'::jsonb,'pitch','referral',NULL, now()-interval '18 days',NULL),
 ('d8000000-0000-4000-a000-000000000018','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Ryan Cooper','ryan.c@ezanatest.edu','Economics','Senior','seed://resumes/18.pdf','seed://pitches/18.pdf','{"pitch":"Long UNP"}'::jsonb,'pitch','linkedin',NULL, now()-interval '18 days',NULL),
 ('d8000000-0000-4000-a000-000000000019','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Sara Ahmed','sara.a@ezanatest.edu','Finance','Junior','seed://resumes/19.pdf','seed://pitches/19.pdf','{"pitch":"Long LLY"}'::jsonb,'pitch','professor',NULL, now()-interval '17 days',NULL),
 ('d8000000-0000-4000-a000-000000000020','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Tomás Rivera','tomas.r@ezanatest.edu','Finance','Junior','seed://resumes/20.pdf','seed://pitches/20.pdf','{"pitch":"Short PLUG"}'::jsonb,'pitch','referral',NULL, now()-interval '17 days',NULL),
 -- offer (3)
 ('d8000000-0000-4000-a000-000000000021','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Uma Krishnan','uma.k@ezanatest.edu','Finance','Junior','seed://resumes/21.pdf','seed://pitches/21.pdf','{}'::jsonb,'offer','referral',NULL, now()-interval '22 days',NULL),
 ('d8000000-0000-4000-a000-000000000022','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Victor Hughes','victor.h@ezanatest.edu','Economics','Senior','seed://resumes/22.pdf','seed://pitches/22.pdf','{}'::jsonb,'offer','career_fair',NULL, now()-interval '22 days',NULL),
 ('d8000000-0000-4000-a000-000000000023','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Wei Chen','wei.c@ezanatest.edu','Finance','Junior','seed://resumes/23.pdf','seed://pitches/23.pdf','{}'::jsonb,'offer','linkedin',NULL, now()-interval '21 days',NULL),
 -- accepted (2) → provisioned into trainee members (Chloe M18, Noah B M19)
 ('d8000000-0000-4000-a000-000000000024','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Chloe Anderson','chloe.and@ezanatest.edu','Finance','Sophomore','seed://resumes/24.pdf','seed://pitches/24.pdf','{}'::jsonb,'accepted','referral',NULL, now()-interval '30 days','d1000000-0000-4000-a000-000000000018'),
 ('d8000000-0000-4000-a000-000000000025','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Noah Bergstrom','noah.berg@ezanatest.edu','Finance','Sophomore','seed://resumes/25.pdf','seed://pitches/25.pdf','{}'::jsonb,'accepted','professor',NULL, now()-interval '30 days','d1000000-0000-4000-a000-000000000019'),
 -- rejected (2, with reasons)
 ('d8000000-0000-4000-a000-000000000026','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Xander Bell','xander.b@ezanatest.edu','Biology','Sophomore','seed://resumes/26.pdf',NULL,'{}'::jsonb,'rejected','club_email','Limited demonstrated interest in markets; encouraged to reapply.', now()-interval '20 days',NULL),
 ('d8000000-0000-4000-a000-000000000027','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Yara Osman','yara.o@ezanatest.edu','Finance','Freshman','seed://resumes/27.pdf','seed://pitches/27.pdf','{}'::jsonb,'rejected','career_fair','Pitch lacked a differentiated view; strong candidate for next cycle.', now()-interval '19 days',NULL),
 -- declined (1, with reason)
 ('d8000000-0000-4000-a000-000000000028','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027','Zoe Martin','zoe.m@ezanatest.edu','Finance','Junior','seed://resumes/28.pdf','seed://pitches/28.pdf','{}'::jsonb,'declined','referral','Accepted a competing consulting club offer.', now()-interval '25 days',NULL)
ON CONFLICT (id) DO NOTHING;

-- ── 9c. APPLICANTS (top-up) — 40 more into Class of 2027 for the design's
--    density. Realistic narrowing funnel (Applied widest). ids d8000000-…041+
--    (no collision with 001-028; teardown-covered by the d8000000-% pattern).
--    Names/program/year/source/applied_at all vary so the funnel + "Applied Nd
--    ago" + by-source breakdown are real; no per-stage numbers are hardcoded.
INSERT INTO public.org_applicants
 (id, org_id, cohort_id, full_name, email, program, year, resume_url, sample_pitch_url, responses, stage, source, rejected_reason, applied_at, provisioned_member_id)
SELECT
  ('d8000000-0000-4000-a000-0000' || lpad((40+n)::text,8,'0'))::uuid,
  '84c0372a-6b0a-4126-963e-9b0aa6660570',
  'd3000000-0000-4000-a000-000000002027',
  nm,
  lower(replace(nm,' ','.')) || (40+n) || '@ezanatest.edu',
  (ARRAY['Finance','Commerce','Economics','Mathematics','Bio + Finance','CompSci','Accounting'])[1+((n-1)%7)],
  (ARRAY['Freshman','Sophomore','Junior','Senior'])[1+((n-1)%4)],
  CASE WHEN (n%7)=0 THEN NULL ELSE 'seed://resumes/'||(40+n)||'.pdf' END,
  CASE WHEN n>=32 THEN 'seed://pitches/'||(40+n)||'.pdf' ELSE NULL END,
  '{}'::jsonb,
  CASE WHEN n<=24 THEN 'applied' WHEN n<=31 THEN 'screened' WHEN n<=34 THEN 'interview'
       WHEN n=35 THEN 'pitch' WHEN n=36 THEN 'offer' WHEN n=37 THEN 'accepted'
       WHEN n<=39 THEN 'rejected' ELSE 'declined' END,
  (ARRAY['career_fair','club_email','referral','linkedin','professor','info_session'])[1+((n-1)%6)],
  CASE WHEN n IN (38,39) THEN 'Screening bar not met this cycle; encouraged to reapply.'
       WHEN n=40 THEN 'Declined — accepted a competing club offer.' ELSE NULL END,
  now() - ((2 + (n % 18)) || ' days')::interval,
  NULL
FROM (
  SELECT n, (ARRAY[
    'Aiden Brooks','Bella Cruz','Caleb Reyes','Daria Volkov','Eli Stone','Farah Karim','Gavin Lee','Hana Suzuki',
    'Ian Walsh','Jade Nakamura','Kyle Petrov','Lena Fischer','Marco Bianchi','Nadia Haddad','Oscar Lindqvist','Paige Turner',
    'Quentin Rowe','Rosa Delgado','Sam Okafor','Tara Singh','Umar Farouk','Vera Ilic','Will Zhang','Xenia Popa',
    'Yusuf Demir','Zara Malik','Adam Novak','Bianca Rossi','Cody Marsh','Devi Rao',
    'Elena Sokolova','Felix Braun','Gia Romano','Hugo Martins','Ines Costa','Jonah Weiss','Kaya Yilmaz','Luca Greco',
    'Maya Iyer','Nolan Pierce'])[n] AS nm
  FROM generate_series(1,40) AS n
) s
ON CONFLICT (id) DO NOTHING;

-- ── 9a. APPLICANT SCORES — multiple interviewers; some submitted_at NULL
--    (unsubmitted → notes stay private in the API → proves anti-anchoring).
INSERT INTO public.org_applicant_scores (id, org_id, applicant_id, interviewer_id, criterion, score, weight, notes, submitted_at, created_at) VALUES
 -- Liam Foster (interview) — two interviewers, one submitted, one still private
 ('d8a00000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000012','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','technical',4.0,1,'Solid DCF instincts.', now()-interval '14 days', now()-interval '15 days'),
 ('d8a00000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000012','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','communication',4.5,1,'Clear and concise.', now()-interval '14 days', now()-interval '15 days'),
 ('d8a00000-0000-4000-a000-000000000003','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000012','d1000000-0000-4000-a000-000000000011','technical',3.5,1,'PRIVATE: wants to see the model before I anchor.',NULL, now()-interval '14 days'),
 ('d8a00000-0000-4000-a000-000000000004','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000012','d1000000-0000-4000-a000-000000000011','culture_fit',4.0,1,'PRIVATE draft — not submitted yet.',NULL, now()-interval '14 days'),
 -- Mia Sanchez (interview)
 ('d8a00000-0000-4000-a000-000000000005','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000013','d1000000-0000-4000-a000-000000000005','technical',3.0,1,'Short thesis was rough.', now()-interval '13 days', now()-interval '15 days'),
 ('d8a00000-0000-4000-a000-000000000006','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000013','d1000000-0000-4000-a000-000000000005','prior_experience',4.0,1,'Good club leadership.', now()-interval '13 days', now()-interval '15 days'),
 -- Quinn Taylor (pitch stage) — three interviewers
 ('d8a00000-0000-4000-a000-000000000007','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000017','e8e3758f-9a71-4efb-9532-228ae257d09e','technical',4.5,1,'Strong MSFT pitch.', now()-interval '17 days', now()-interval '18 days'),
 ('d8a00000-0000-4000-a000-000000000008','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000017','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','communication',4.5,1,'Confident under Q&A.', now()-interval '17 days', now()-interval '18 days'),
 ('d8a00000-0000-4000-a000-000000000009','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000017','d1000000-0000-4000-a000-000000000006','culture_fit',5.0,1,'Great fit.', now()-interval '17 days', now()-interval '18 days'),
 -- Uma Krishnan (offer)
 ('d8a00000-0000-4000-a000-000000000010','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000021','e8e3758f-9a71-4efb-9532-228ae257d09e','technical',4.0,1,'Recommend offer.', now()-interval '21 days', now()-interval '22 days'),
 ('d8a00000-0000-4000-a000-000000000011','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000021','d1000000-0000-4000-a000-000000000007','communication',4.5,1,'Polished.', now()-interval '21 days', now()-interval '22 days')
ON CONFLICT (id) DO NOTHING;

-- ── 9d. APPLICANT SCORES (top-up) — for new top-up applicants: one fully-scored
--    (3/3 submitted), two partially-scored (a 2-of-3 with an unsubmitted NULL row
--    → the rubric "—" / anti-anchoring state). Aggregate ★ is the weighted mean
--    of SUBMITTED rows only. Interviewers are existing members. ids d8a00000-…041+
INSERT INTO public.org_applicant_scores (id, org_id, applicant_id, interviewer_id, criterion, score, weight, notes, submitted_at, created_at) VALUES
 -- top-up interview applicant #072 — fully scored (3 of 3 submitted)
 ('d8a00000-0000-4000-a000-000000000041','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000072','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','technical',4.0,1,'Sharp on comps.', now()-interval '11 days', now()-interval '12 days'),
 ('d8a00000-0000-4000-a000-000000000042','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000072','e8e3758f-9a71-4efb-9532-228ae257d09e','communication',4.5,1,'Articulate.', now()-interval '11 days', now()-interval '12 days'),
 ('d8a00000-0000-4000-a000-000000000043','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000072','d1000000-0000-4000-a000-000000000006','culture_fit',4.0,1,'Collaborative.', now()-interval '11 days', now()-interval '12 days'),
 -- top-up interview applicant #073 — 2 of 3 (one interviewer not submitted → —)
 ('d8a00000-0000-4000-a000-000000000044','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000073','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','technical',3.5,1,'Reasonable.', now()-interval '10 days', now()-interval '11 days'),
 ('d8a00000-0000-4000-a000-000000000045','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000073','d1000000-0000-4000-a000-000000000005','prior_experience',4.0,1,'Good background.', now()-interval '10 days', now()-interval '11 days'),
 ('d8a00000-0000-4000-a000-000000000046','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000073','d1000000-0000-4000-a000-000000000011','communication',3.0,1,'PRIVATE draft — not submitted.',NULL, now()-interval '10 days'),
 -- top-up pitch applicant #075 — 2 of 3 (one unsubmitted → —)
 ('d8a00000-0000-4000-a000-000000000047','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000075','e8e3758f-9a71-4efb-9532-228ae257d09e','technical',4.5,1,'Strong pitch.', now()-interval '9 days', now()-interval '10 days'),
 ('d8a00000-0000-4000-a000-000000000048','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000075','e09e4c06-dd92-4190-82b6-bb75b0f8c3be','communication',4.0,1,'Handled Q&A well.', now()-interval '9 days', now()-interval '10 days'),
 ('d8a00000-0000-4000-a000-000000000049','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000075','d1000000-0000-4000-a000-000000000007','culture_fit',4.5,1,'PRIVATE — will submit after panel.',NULL, now()-interval '9 days'),
 -- top-up offer applicant #076 — fully scored (2 of 2 submitted)
 ('d8a00000-0000-4000-a000-000000000050','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000076','e8e3758f-9a71-4efb-9532-228ae257d09e','technical',4.0,1,'Recommend offer.', now()-interval '8 days', now()-interval '9 days'),
 ('d8a00000-0000-4000-a000-000000000051','84c0372a-6b0a-4126-963e-9b0aa6660570','d8000000-0000-4000-a000-000000000076','d1000000-0000-4000-a000-000000000006','communication',4.5,1,'Polished and prepared.', now()-interval '8 days', now()-interval '9 days')
ON CONFLICT (id) DO NOTHING;

-- ── 9b. APPLICATION FORM (one; blind_screening available but off) ───────────
INSERT INTO public.org_application_forms (id, org_id, cohort_id, fields, public_slug, is_open, blind_screening, created_at) VALUES
 ('d8b00000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','d3000000-0000-4000-a000-000000002027',
  '[{"kind":"short_text","label":"Full name","required":true},{"kind":"short_text","label":"Program"},{"kind":"dropdown","label":"Year","options":["Freshman","Sophomore","Junior","Senior"]},{"kind":"file","label":"Resume"},{"kind":"ticker","label":"A stock you like"},{"kind":"long_text","label":"Why this fund?"}]'::jsonb,
  'ezana-test-2027-application', true, false, now()-interval '35 days')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 10. ALUMNI RECORDS — 15 (member_id → the alumni org_members). Industry spread
--     ib/pe/am/consulting/other; ~12/15 placed within 6mo → ~80% banner.
-- ============================================================================
INSERT INTO public.org_alumni_records
 (id, org_id, member_id, cohort_id, grad_term, final_rating, final_pitch_count, employer, employer_industry, role_title, placed_within_6mo, engagement_flags, created_at)
SELECT
  ('d9000000-0000-4000-a000-0000000000' || lpad(n::text,2,'0'))::uuid,
  '84c0372a-6b0a-4126-963e-9b0aa6660570',
  ('d1000000-0000-4000-a000-0000000000' || lpad(n::text,2,'0'))::uuid,
  'd3000000-0000-4000-a000-000000002025','Spring 2025',
  (ARRAY[3450,3820,2980,3610,3120,2760,3990,3300,2540,3680,2890,3410,3150,2670,3550])[n-19],
  (ARRAY[14,22,9,18,11,7,26,15,6,19,10,16,12,8,17])[n-19],
  (ARRAY['Goldman Sachs','Blackstone','Fidelity','McKinsey & Co','Bridgewater',
         'Morgan Stanley','KKR','Wellington','Bain & Co','Citadel',
         'J.P. Morgan','Apollo','T. Rowe Price','BCG','Point72'])[n-19],
  (ARRAY['ib','pe','am','consulting','other','ib','pe','am','consulting','other','ib','pe','am','consulting','other'])[n-19],
  (ARRAY['IB Analyst','PE Analyst','Equity Research','Business Analyst','Investment Associate',
         'IB Analyst','PE Analyst','Portfolio Analyst','Associate Consultant','Research Analyst',
         'IB Analyst','PE Analyst','Equity Analyst','Associate','Research Analyst'])[n-19],
  (n-19) NOT IN (3,9,14),  -- 3 not placed within 6mo → 12/15 ≈ 80%
  CASE WHEN (ARRAY['guest_speaker,mentor','recruiter','mentor','donor','_','guest_speaker','recruiter,donor','mentor','_','guest_speaker,recruiter','mentor','donor','guest_speaker','_','recruiter'])[n-19] = '_'
       THEN '{}'::text[]
       ELSE string_to_array((ARRAY['guest_speaker,mentor','recruiter','mentor','donor','_','guest_speaker','recruiter,donor','mentor','_','guest_speaker,recruiter','mentor','donor','guest_speaker','_','recruiter'])[n-19], ',')
  END,
  now()-interval '300 days'
FROM generate_series(20,34) AS n
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 11. FUND SNAPSHOTS — 32 weekly points forming ONE coherent fund curve
--     (~$700k → $835,300, S&P +11.4%). The demo org's prior snapshots (including
--     8 pre-existing rows on a DIFFERENT value scale) are cleared first so the
--     series is a single continuous line — interleaving the two scales rendered
--     as a sawtooth. The delete is scoped STRICTLY to the demo org.
-- ============================================================================
DELETE FROM public.org_fund_snapshots
 WHERE org_id = '84c0372a-6b0a-4126-963e-9b0aa6660570';   -- demo org ONLY

INSERT INTO public.org_fund_snapshots
 (id, org_id, cohort_id, snapshot_date, total_value, total_cost, return_pct, benchmark_return_pct, alpha_pct, attribution, computed_at)
SELECT
  ('da000000-0000-4000-a000-0000' || lpad(n::text,8,'0'))::uuid,
  '84c0372a-6b0a-4126-963e-9b0aa6660570','9e1f95d9-5978-442a-abdd-588482f94575',
  (current_date - ((32-n)*7))::date,
  round(v, 2),
  700000,
  round((v - 700000) / 700000.0 * 100, 2),
  round((n - 1) * (11.4 / 31.0), 2),
  round((v - 700000) / 700000.0 * 100 - (n - 1) * (11.4 / 31.0), 2),
  '{"TMT":0.4,"Healthcare":0.2,"Financials":0.15,"Energy":0.1,"Other":0.15}'::jsonb,
  now()
FROM (
  -- Linear ramp 700000→835300 across the 32 weeks + a gentle sinusoidal wiggle
  -- (~0.35%, a couple of soft drawdowns), detrended so week 32 lands EXACTLY on
  -- 835300. Smooth in value — no point is a spike off its neighbour.
  SELECT n,
         700000 + (n - 1) * (135300.0 / 31.0)
           + 2600 * sin((n * 0.7)::double precision)::numeric
           - 2600 * sin((32 * 0.7)::double precision)::numeric * (n - 1) / 31.0 AS v
  FROM generate_series(1, 32) AS n
) s
ON CONFLICT (org_id, snapshot_date) DO NOTHING;

-- ============================================================================
-- 12. RECOGNITION / EZANA RATING — a rating for every active member, category
--     scores on the role-correct weights, a transaction history tied to real
--     pitch receipts, and badges/awards. Calibration is HONEST: members whose
--     seeded high-conviction pitches lost (Blackberry/ROKU, Ravi/GE, Fatima/XOM)
--     carry LOWER calibration; winners (Noah Asheber/GOOGL, Jordan, Hannah/FCX,
--     Carlos/MA) carry HIGHER. 4 provisional members (rated_thesis_count<10).
--     NOTE: org_rating_weights platform defaults (org_id NULL) already seeded by
--     the migration — intentionally NOT re-inserted here.
-- ============================================================================
INSERT INTO public.org_member_rating (id, org_id, member_id, rating, tier, rated_thesis_count, updated_at)
SELECT ('db000000-0000-4000-a000-' || lpad((row_number() over (order by m.mid))::text,12,'0'))::uuid,
       '84c0372a-6b0a-4126-963e-9b0aa6660570', m.mid::uuid, m.rating, m.tier, m.cnt, now()
FROM (VALUES
  ('e8e3758f-9a71-4efb-9532-228ae257d09e',4180,'cio',30),
  ('1ff8ab9a-1c40-4b38-9812-e28ce7a151a3',3600,'portfolio_mgr',14),
  ('e09e4c06-dd92-4190-82b6-bb75b0f8c3be',4050,'portfolio_mgr',22),
  ('fc2ca48d-c5c4-4713-a156-4c43d0394175',2650,'analyst',12),
  ('d1000000-0000-4000-a000-000000000005',3600,'portfolio_mgr',20),
  ('d1000000-0000-4000-a000-000000000006',3720,'portfolio_mgr',18),
  ('d1000000-0000-4000-a000-000000000007',3250,'portfolio_mgr',15),
  ('d1000000-0000-4000-a000-000000000008',3150,'portfolio_mgr',16),
  ('d1000000-0000-4000-a000-000000000009',3080,'portfolio_mgr',14),
  ('d1000000-0000-4000-a000-000000000010',3500,'portfolio_mgr',17),
  ('d1000000-0000-4000-a000-000000000011',3850,'senior_analyst',21),
  ('d1000000-0000-4000-a000-000000000012',3400,'senior_analyst',16),
  ('d1000000-0000-4000-a000-000000000013',3200,'senior_analyst',14),
  ('d1000000-0000-4000-a000-000000000014',2820,'analyst',11),
  ('d1000000-0000-4000-a000-000000000015',2550,'analyst',8),
  ('d1000000-0000-4000-a000-000000000016',2500,'analyst',9),
  ('d1000000-0000-4000-a000-000000000017',2700,'analyst',12),
  ('d1000000-0000-4000-a000-000000000018',1400,'trainee',3),
  ('d1000000-0000-4000-a000-000000000019',1350,'trainee',2)
) AS m(mid, rating, tier, cnt)
ON CONFLICT (org_id, member_id) DO NOTHING;

-- ── 12a. CATEGORY SCORES — 6 per member on the role-correct weight set ───────
INSERT INTO public.org_rating_categories (id, org_id, member_id, category, score, weight, computed_at)
SELECT ('dbb00000-0000-4000-a000-' || lpad((row_number() over (order by m.mid, w.category))::text,12,'0'))::uuid,
       '84c0372a-6b0a-4126-963e-9b0aa6660570', m.mid::uuid, w.category,
       CASE WHEN w.category='calibration' THEN m.cal
            ELSE greatest(0, least(100,
                 greatest(20, least(96, round((m.rating-1200)/33.0)))
                 + ((('x'||substr(md5(w.category),1,2))::bit(8)::int % 11) - 5)))
       END::numeric,
       w.weight, now()
FROM (VALUES
  ('e8e3758f-9a71-4efb-9532-228ae257d09e','vp',4180,88),
  ('1ff8ab9a-1c40-4b38-9812-e28ce7a151a3','vp',3600,78),
  ('e09e4c06-dd92-4190-82b6-bb75b0f8c3be','portfolio_manager',4050,90),
  ('fc2ca48d-c5c4-4713-a156-4c43d0394175','analyst',2650,52),
  ('d1000000-0000-4000-a000-000000000005','portfolio_manager',3600,82),
  ('d1000000-0000-4000-a000-000000000006','portfolio_manager',3720,84),
  ('d1000000-0000-4000-a000-000000000007','portfolio_manager',3250,74),
  ('d1000000-0000-4000-a000-000000000008','portfolio_manager',3150,72),
  ('d1000000-0000-4000-a000-000000000009','portfolio_manager',3080,70),
  ('d1000000-0000-4000-a000-000000000010','portfolio_manager',3500,86),
  ('d1000000-0000-4000-a000-000000000011','analyst',3850,89),
  ('d1000000-0000-4000-a000-000000000012','analyst',3400,80),
  ('d1000000-0000-4000-a000-000000000013','analyst',3200,83),
  ('d1000000-0000-4000-a000-000000000014','analyst',2820,58),
  ('d1000000-0000-4000-a000-000000000015','analyst',2550,66),
  ('d1000000-0000-4000-a000-000000000016','analyst',2500,64),
  ('d1000000-0000-4000-a000-000000000017','analyst',2700,55),
  ('d1000000-0000-4000-a000-000000000018','analyst',1400,45),
  ('d1000000-0000-4000-a000-000000000019','analyst',1350,42)
) AS m(mid, role_set, rating, cal)
JOIN (VALUES
  ('vp','leadership',22),('vp','team_uplift',20),('vp','calibration',16),('vp','research_oversight',16),('vp','engagement',14),('vp','task_efficiency',12),
  ('portfolio_manager','calibration',20),('portfolio_manager','portfolio_alpha',24),('portfolio_manager','risk_management',18),('portfolio_manager','allocation_discipline',14),('portfolio_manager','engagement',12),('portfolio_manager','task_efficiency',12),
  ('analyst','calibration',22),('analyst','alpha_vs_sector',24),('analyst','research_output',18),('analyst','learning',12),('analyst','task_efficiency',12),('analyst','engagement',12)
) AS w(role_set, category, weight) ON w.role_set = m.role_set
ON CONFLICT (org_id, member_id, category) DO NOTHING;

-- ── 12b. RATING TRANSACTIONS — history with real pitch receipts ─────────────
INSERT INTO public.org_rating_transactions (id, org_id, member_id, delta, rating_after, reason, pitch_id, created_at) VALUES
 ('dba00000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','e09e4c06-dd92-4190-82b6-bb75b0f8c3be', 45, 4050,'thesis_resolved','d4000000-0000-4000-a000-000000000017', now()-interval '1 day'),
 ('dba00000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','e09e4c06-dd92-4190-82b6-bb75b0f8c3be', 30, 4005,'thesis_resolved','d4000000-0000-4000-a000-000000000015', now()-interval '10 days'),
 ('dba00000-0000-4000-a000-000000000003','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000013', 32, 3200,'thesis_resolved','d4000000-0000-4000-a000-000000000019', now()-interval '1 day'),
 ('dba00000-0000-4000-a000-000000000004','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000010', 30, 3500,'thesis_resolved','d4000000-0000-4000-a000-000000000022', now()-interval '1 day'),
 ('dba00000-0000-4000-a000-000000000005','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000012',  5, 3400,'thesis_resolved','d4000000-0000-4000-a000-000000000018', now()-interval '1 day'),
 ('dba00000-0000-4000-a000-000000000006','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000014',-22, 2820,'thesis_resolved','d4000000-0000-4000-a000-000000000020', now()-interval '1 day'),
 ('dba00000-0000-4000-a000-000000000007','84c0372a-6b0a-4126-963e-9b0aa6660570','fc2ca48d-c5c4-4713-a156-4c43d0394175',-35, 2650,'thesis_resolved','d4000000-0000-4000-a000-000000000021', now()-interval '1 day'),
 ('dba00000-0000-4000-a000-000000000008','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000017',-18, 2700,'thesis_resolved','d4000000-0000-4000-a000-000000000023', now()-interval '1 day'),
 ('dba00000-0000-4000-a000-000000000009','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000015', -8, 2550,'decay',NULL, now()-interval '30 days'),
 ('dba00000-0000-4000-a000-000000000010','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000016', -6, 2500,'decay',NULL, now()-interval '30 days'),
 ('dba00000-0000-4000-a000-000000000011','84c0372a-6b0a-4126-963e-9b0aa6660570','e8e3758f-9a71-4efb-9532-228ae257d09e', 50, 4180,'admin',NULL, now()-interval '60 days'),
 ('dba00000-0000-4000-a000-000000000012','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000011', 40, 3850,'thesis_resolved','d4000000-0000-4000-a000-000000000009', now()-interval '20 days'),
 ('dba00000-0000-4000-a000-000000000013','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000018', 15, 1400,'admin',NULL, now()-interval '15 days'),
 ('dba00000-0000-4000-a000-000000000014','84c0372a-6b0a-4126-963e-9b0aa6660570','d1000000-0000-4000-a000-000000000019', 10, 1350,'admin',NULL, now()-interval '14 days')
ON CONFLICT (id) DO NOTHING;

-- ── 12c. BADGES & AWARDS — recipient_id / awarded_by are auth.users ids ─────
INSERT INTO public.org_recognition (id, org_id, recipient_id, awarded_by, badge_type, title, reason, period, auto_generated, is_award, pitch_id, created_at) VALUES
 ('dc000000-0000-4000-a000-000000000001','84c0372a-6b0a-4126-963e-9b0aa6660570','b0a9a9d4-54a2-4461-a203-95d869dae6c1','e9a6277b-7cc2-4395-b85b-6de8ddbada83','best_pitch','Best Pitch — MSFT','Highest-conviction, best-executed pitch of the term.','Fall 2026',false,true,'d4000000-0000-4000-a000-000000000015', now()-interval '10 days'),
 ('dc000000-0000-4000-a000-000000000002','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000011','e9a6277b-7cc2-4395-b85b-6de8ddbada83','analyst_of_term','Analyst of the Term','Top-rated analyst by composite Ezana Rating.','Fall 2026',false,true,NULL, now()-interval '8 days'),
 ('dc000000-0000-4000-a000-000000000003','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000010','e9a6277b-7cc2-4395-b85b-6de8ddbada83','best_call','Best Exit — FCX','Booked the gain at target on a high-conviction call.','Fall 2026',false,true,'d4000000-0000-4000-a000-000000000022', now()-interval '20 days'),
 ('dc000000-0000-4000-a000-000000000004','84c0372a-6b0a-4126-963e-9b0aa6660570','c45adbae-9cce-4508-9a1e-62a78efdc4b5','b0a9a9d4-54a2-4461-a203-95d869dae6c1','best_postmortem','Best Post-Mortem','Turned the ROKU loss into the desk''s best teaching artifact.','Fall 2026',false,false,'d4000000-0000-4000-a000-000000000021', now()-interval '18 days'),
 ('dc000000-0000-4000-a000-000000000005','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000018','b0a9a9d4-54a2-4461-a203-95d869dae6c1','first_pitch','First Pitch Submitted','Completed and submitted a first pitch.','Fall 2026',true,false,NULL, now()-interval '12 days'),
 ('dc000000-0000-4000-a000-000000000006','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000019','d0000000-0000-4000-a000-000000000010','rookie','Rookie of the Term','Fastest-ramping trainee this term.','Fall 2026',true,false,NULL, now()-interval '9 days'),
 ('dc000000-0000-4000-a000-000000000007','84c0372a-6b0a-4126-963e-9b0aa6660570','d0000000-0000-4000-a000-000000000013','d0000000-0000-4000-a000-000000000006','coverage_streak','Coverage Streak','Eight consecutive on-time coverage updates.','Fall 2026',true,false,NULL, now()-interval '5 days'),
 ('dc000000-0000-4000-a000-000000000008','84c0372a-6b0a-4126-963e-9b0aa6660570','b0a9a9d4-54a2-4461-a203-95d869dae6c1','e9a6277b-7cc2-4395-b85b-6de8ddbada83','pm_excellence','PM Excellence','Led the TMT desk to top sector alpha.','Fall 2026',false,true,NULL, now()-interval '7 days')
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================================================
-- ⚠ TEARDOWN (commented out) — RESET THE DEMO WITHOUT TOUCHING REAL DATA.
--
-- This org ("Ezana Test University", 84c0372a-…) is SHARED with real test data
-- (pre-existing: 3 pitches, 1 assignment, 2 notes, 8 fund snapshots, 4 members,
-- 8 teams, the "Fall 2026" cohort). Therefore this teardown deletes ONLY rows
-- this seed inserted, addressed by their structured seed-namespace UUID prefixes
-- — never by org_id. It does NOT delete the organizations row, the reused teams,
-- the "Fall 2026" cohort, or any of the 4 pre-existing members / pre-existing
-- pitch / note / assignment / snapshot. (The org, "Fall 2026" cohort, and the 4
-- members were UPSERTed; their pre-existing protected fields are unaffected by a
-- delete-by-seeded-id teardown, which simply won't match them.)
--
-- Run inside one transaction; order is reverse-FK. Uncomment to execute.
-- ----------------------------------------------------------------------------
-- BEGIN;
--   DELETE FROM public.org_recognition           WHERE id::text LIKE 'dc000000-0000-4000-a000-%';
--   DELETE FROM public.org_rating_transactions   WHERE id::text LIKE 'dba00000-0000-4000-a000-%';
--   DELETE FROM public.org_rating_categories     WHERE id::text LIKE 'dbb00000-0000-4000-a000-%';
--   DELETE FROM public.org_member_rating         WHERE id::text LIKE 'db000000-0000-4000-a000-%';
--   DELETE FROM public.org_fund_snapshots        WHERE id::text LIKE 'da000000-0000-4000-a000-%';
--   DELETE FROM public.org_alumni_records        WHERE id::text LIKE 'd9000000-0000-4000-a000-%';
--   DELETE FROM public.org_applicant_scores      WHERE id::text LIKE 'd8a00000-0000-4000-a000-%';
--   DELETE FROM public.org_application_forms     WHERE id::text LIKE 'd8b00000-0000-4000-a000-%';
--   DELETE FROM public.org_applicants            WHERE id::text LIKE 'd8000000-0000-4000-a000-%';
--   DELETE FROM public.org_onboarding_tasks      WHERE id::text LIKE 'd7e00000-0000-4000-a000-%';
--   DELETE FROM public.org_assignment_comments   WHERE id::text LIKE 'd7c00000-0000-4000-a000-%';
--   DELETE FROM public.org_assignment_submissions WHERE id::text LIKE 'd7b00000-0000-4000-a000-%';
--   DELETE FROM public.org_assignment_assignees  WHERE id::text LIKE 'd7a00000-0000-4000-a000-%';
--   DELETE FROM public.org_assignments           WHERE id::text LIKE 'd7000000-0000-4000-a000-%';
--   DELETE FROM public.org_assignment_templates  WHERE id::text LIKE 'd7d00000-0000-4000-a000-%';
--   DELETE FROM public.org_meeting_votes         WHERE id::text LIKE 'd6d00000-0000-4000-a000-%';
--   DELETE FROM public.org_meeting_deliverables  WHERE id::text LIKE 'd6c00000-0000-4000-a000-%';
--   DELETE FROM public.org_meeting_sentiment     WHERE meeting_id::text LIKE 'd6000000-0000-4000-a000-%';
--   DELETE FROM public.org_meeting_attendees     WHERE id::text LIKE 'd6a00000-0000-4000-a000-%';
--   DELETE FROM public.org_meetings              WHERE id::text LIKE 'd6000000-0000-4000-a000-%';
--   DELETE FROM public.org_ic_meetings           WHERE id::text LIKE 'd6f00000-0000-4000-a000-%';
--   DELETE FROM public.org_coverage_lineage      WHERE id::text LIKE 'd5e00000-0000-4000-a000-%';
--   DELETE FROM public.org_research_collections  WHERE id::text LIKE 'd5d00000-0000-4000-a000-%';
--   DELETE FROM public.org_research_templates    WHERE id::text LIKE 'd5c00000-0000-4000-a000-%';
--   DELETE FROM public.org_research_comments     WHERE id::text LIKE 'd5b00000-0000-4000-a000-%';
--   DELETE FROM public.org_research_versions     WHERE id::text LIKE 'd5a00000-0000-4000-a000-%';
--   DELETE FROM public.org_research_notes        WHERE id::text LIKE 'd5000000-0000-4000-a000-%';
--   DELETE FROM public.org_pitch_hindsight       WHERE pitch_id::text LIKE 'd4000000-0000-4000-a000-%';
--   DELETE FROM public.org_pitch_discussion_messages WHERE id::text LIKE 'd4d00000-0000-4000-a000-%';
--   DELETE FROM public.org_pitch_stage_history   WHERE id::text LIKE 'd4c00000-0000-4000-a000-%';
--   DELETE FROM public.org_pitch_deliverables    WHERE id::text LIKE 'd4b00000-0000-4000-a000-%';
--   DELETE FROM public.org_pitch_votes           WHERE id::text LIKE 'd4a00000-0000-4000-a000-%';
--   DELETE FROM public.org_pitches               WHERE id::text LIKE 'd4000000-0000-4000-a000-%';
--   -- members: delete ONLY the 15 new active + 15 alumni (d1000000-…); the 4
--   -- pre-existing members have non-'d1' ids and are never matched.
--   DELETE FROM public.org_members               WHERE id::text LIKE 'd1000000-0000-4000-a000-%';
--   -- new cohorts only (Class of 2027 / 2025); "Fall 2026" (9e1f95d9-…) is kept.
--   DELETE FROM public.org_cohorts               WHERE id::text LIKE 'd3000000-0000-4000-a000-%';
--   -- demo auth.users only (d0000000-…, NN 05..34). Real accounts are untouched.
--   DELETE FROM auth.users                       WHERE id::text LIKE 'd0000000-0000-4000-a000-%';
--   -- NOTE: organizations row, reused teams, and the "Fall 2026" cohort are
--   -- intentionally NOT deleted (they pre-exist / are shared).
-- COMMIT;
-- ============================================================================

