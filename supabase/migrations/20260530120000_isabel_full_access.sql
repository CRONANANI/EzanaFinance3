-- ═══════════════════════════════════════════════════════════
-- FULL ACCESS SETUP: isabel.lim546@gmail.com
--
-- Grants: Regular user (pro tier) + Partner/Creator + Org Executive
-- at Ezana Test University
--
-- PREREQUISITE: User must exist in auth.users (sign up first).
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
  _uid UUID;
  _org_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  SELECT id INTO _uid FROM auth.users WHERE email = 'isabel.lim546@gmail.com' LIMIT 1;

  IF _uid IS NULL THEN
    RAISE NOTICE 'User isabel.lim546@gmail.com not found in auth.users — skip until they sign up.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found user UUID: %', _uid;

  -- 1. REGULAR USER — Full profile + pro subscription
  INSERT INTO public.profiles (
    id,
    email_verified,
    onboarding_completed,
    investor_questionnaire_completed,
    has_seen_tutorial
  )
  VALUES (_uid, true, true, true, false)
  ON CONFLICT (id) DO UPDATE SET
    email_verified = true,
    onboarding_completed = true,
    investor_questionnaire_completed = true,
    has_seen_tutorial = COALESCE(public.profiles.has_seen_tutorial, false);

  UPDATE public.profiles SET
    subscription_status = 'active',
    subscription_plan = 'professional_annual',
    is_partner = true,
    partner_type = 'creator'
  WHERE id = _uid;

  UPDATE auth.users SET
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
      || '{"role": "admin"}'::jsonb
      || '{"partner_role": "creator"}'::jsonb
  WHERE id = _uid;

  -- 2. PARTNER / CREATOR
  IF EXISTS (SELECT 1 FROM public.partners WHERE user_id = _uid) THEN
    UPDATE public.partners SET
      username = COALESCE(username, 'isabel.lim'),
      display_name = 'Isabel Lim',
      status = 'active',
      partner_role = 'creator',
      bio = COALESCE(bio, 'Full-access test account with partner/creator privileges.'),
      verified = true
    WHERE user_id = _uid;
  ELSE
    INSERT INTO public.partners (
      user_id,
      username,
      display_name,
      status,
      bio,
      partner_role,
      verified
    )
    VALUES (
      _uid,
      'isabel.lim',
      'Isabel Lim',
      'active',
      'Full-access test account with partner/creator privileges.',
      'creator',
      true
    );
  END IF;

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

  RAISE NOTICE 'Full access granted for user %', _uid;
END $$;
