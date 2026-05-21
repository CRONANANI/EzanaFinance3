-- ═══════════════════════════════════════════════════════════
-- FULL ACCESS SETUP: isabel.lim546@gmail.com (FIXED)
--
-- Includes email + all NOT NULL fields on profiles.
-- PREREQUISITE: User must exist in auth.users (sign up first).
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  _uid UUID;
  _email TEXT := 'isabel.lim546@gmail.com';
  _org_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = _email LIMIT 1;

  IF _uid IS NULL THEN
    RAISE EXCEPTION 'User % not found in auth.users. Sign up first.', _email;
  END IF;

  RAISE NOTICE 'Found user UUID: %', _uid;

  -- 1. PROFILE — include email + all required fields
  INSERT INTO public.profiles (
    id,
    email,
    email_verified,
    onboarding_completed,
    investor_questionnaire_completed,
    has_seen_tutorial,
    updated_at
  )
  VALUES (
    _uid,
    _email,
    true,
    true,
    true,
    false,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = _email,
    email_verified = true,
    onboarding_completed = true,
    investor_questionnaire_completed = true,
    has_seen_tutorial = COALESCE(public.profiles.has_seen_tutorial, false),
    updated_at = NOW();

  UPDATE public.profiles SET
    subscription_status = 'active',
    current_plan = 'pro_advanced',
    subscription_plan = 'professional_annual',
    is_partner = true,
    partner_type = 'creator'
  WHERE id = _uid;

  UPDATE auth.users SET
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
      || '{"role": "admin", "partner_role": "creator"}'::jsonb
  WHERE id = _uid;

  RAISE NOTICE 'Step 1 done: Profile + pro subscription set';

  -- 2. PARTNER / CREATOR
  CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_user_id_unique ON public.partners(user_id);

  INSERT INTO public.partners (user_id, username, display_name, status, bio, specializations, partner_type)
  VALUES (
    _uid,
    'isabel.lim',
    'Isabel Lim',
    'active',
    'Full-access account with partner/creator privileges.',
    ARRAY['markets', 'analysis', 'education'],
    'creator'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'active',
    partner_type = 'creator';

  RAISE NOTICE 'Step 2 done: Partner entry created';

  -- 3. ORG EXECUTIVE — Ezana Test University
  INSERT INTO public.organizations (id, name, slug, university_name, email_domain, is_active)
  VALUES (
    _org_id,
    'Ezana Test University Investment Council',
    'ezana-test-university',
    'Ezana Test University',
    'ezanatest.edu',
    true
  )
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO public.org_members (user_id, org_id, role, team_id, display_name, sub_role, is_active)
  VALUES (
    _uid,
    _org_id,
    'executive',
    NULL,
    'Isabel Lim',
    'Chief Investment Officer',
    true
  )
  ON CONFLICT (user_id, org_id) DO UPDATE SET
    role = 'executive',
    display_name = 'Isabel Lim',
    sub_role = 'Chief Investment Officer',
    is_active = true;

  RAISE NOTICE 'Step 3 done: Org executive set';
  RAISE NOTICE 'All done! isabel.lim546@gmail.com has full access.';
END $$;
