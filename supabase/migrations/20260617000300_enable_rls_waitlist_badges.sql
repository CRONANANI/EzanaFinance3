-- Security: enable Row Level Security on three tables that were fully exposed to
-- the anon/authenticated roles (flagged by Supabase advisor rls_disabled).

-- waitlist holds PII (email, full_name, ip_address, user_agent). It is only ever
-- accessed by /api/waitlist via the service-role client, which BYPASSES RLS.
-- Enabling RLS with no client policies therefore locks anon/authenticated out
-- (default deny) without breaking the signup flow.
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Badge catalogs are non-sensitive reference data rendered across the app.
-- Public read-only; inserts/updates happen via the service role (seeding), which
-- bypasses RLS, so no write policies are needed.
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "badge_definitions_public_read" ON public.badge_definitions;
CREATE POLICY "badge_definitions_public_read"
  ON public.badge_definitions FOR SELECT USING (true);

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "badges_public_read" ON public.badges;
CREATE POLICY "badges_public_read"
  ON public.badges FOR SELECT USING (true);
