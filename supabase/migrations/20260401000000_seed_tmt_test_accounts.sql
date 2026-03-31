-- ═══════════════════════════════════════════════════════════
-- SEED: TMT Test Accounts for Ezana Test University
--
-- INSTRUCTIONS:
-- 1. Create auth users in Supabase for:
--    - noah@raymondleigh.com (executive)
--    - blackberry4567712@gmail.com (analyst on TMT)
-- 2. Get their auth.users UUIDs from the Supabase dashboard
-- 3. Replace the placeholder UUIDs below with the real ones
-- 4. Run this migration
-- ═══════════════════════════════════════════════════════════

-- Step 1: Make sure the organization exists
INSERT INTO public.organizations (id, name, slug, university_name, email_domain, is_active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Ezana Test University Investment Council',
  'ezana-test-university',
  'Ezana Test University',
  'ezanatest.edu',
  true
)
ON CONFLICT (slug) DO NOTHING;

-- Step 2: Make sure TMT team exists
INSERT INTO public.org_teams (id, org_id, name, slug, description)
VALUES (
  'b0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000001',
  'Technology, Media & Telecom',
  'tmt',
  'Covers technology, media, and telecommunications sectors including semiconductors, software, digital advertising, streaming, and telecom infrastructure.'
)
ON CONFLICT (org_id, slug) DO NOTHING;

-- Step 3: Also seed the other 6 teams so executive view works
INSERT INTO public.org_teams (id, org_id, name, slug, description) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Healthcare', 'healthcare', 'Healthcare sector coverage'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Consumer Goods & Services', 'consumer-goods', 'Consumer sector coverage'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Energy & Utilities', 'energy-utilities', 'Energy sector coverage'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Financial Institutions', 'financial-institutions', 'FIG sector coverage'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Industrials', 'industrials', 'Industrials sector coverage'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Metals & Mining', 'metals-mining', 'Metals & Mining sector coverage')
ON CONFLICT (org_id, slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- Step 4: Insert org_members
-- ⚠️  REPLACE THESE UUIDs WITH REAL auth.users IDs
-- ═══════════════════════════════════════════════════════════

-- Noah — Executive (VP of Operations)
INSERT INTO public.org_members (user_id, org_id, role, team_id, display_name, sub_role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'executive',
  NULL,
  'Noah Raymond-Leigh',
  'VP of Operations',
  true
)
ON CONFLICT (user_id, org_id) DO UPDATE SET
  role = EXCLUDED.role,
  team_id = EXCLUDED.team_id,
  display_name = EXCLUDED.display_name,
  sub_role = EXCLUDED.sub_role,
  is_active = EXCLUDED.is_active;

-- Blackberry — Analyst on TMT
INSERT INTO public.org_members (user_id, org_id, role, team_id, display_name, sub_role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'analyst',
  'b0000000-0000-0000-0000-000000000007',
  'Blackberry Analyst',
  'Analyst',
  true
)
ON CONFLICT (user_id, org_id) DO UPDATE SET
  role = EXCLUDED.role,
  team_id = EXCLUDED.team_id,
  display_name = EXCLUDED.display_name,
  sub_role = EXCLUDED.sub_role,
  is_active = EXCLUDED.is_active;

-- Step 5: Profiles — onboarding + verification (distinct user IDs)
INSERT INTO public.profiles (id, email_verified, onboarding_completed)
VALUES
  ('00000000-0000-0000-0000-000000000001', true, true),
  ('00000000-0000-0000-0000-000000000002', true, true)
ON CONFLICT (id) DO UPDATE SET
  email_verified = true,
  onboarding_completed = true;
