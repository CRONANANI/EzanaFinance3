-- SnapTrade user mapping: one row per Ezana user that has registered with SnapTrade.
CREATE TABLE IF NOT EXISTS public.snaptrade_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  snaptrade_user_id TEXT NOT NULL UNIQUE,
  user_secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.snaptrade_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service role only" ON public.snaptrade_users;
CREATE POLICY "service role only" ON public.snaptrade_users
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.snaptrade_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brokerage_authorization_id TEXT NOT NULL UNIQUE,
  brokerage_name TEXT NOT NULL,
  is_disabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_snaptrade_connections_user ON public.snaptrade_connections(user_id);
ALTER TABLE public.snaptrade_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own" ON public.snaptrade_connections;
CREATE POLICY "users read own" ON public.snaptrade_connections
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service role manages" ON public.snaptrade_connections;
CREATE POLICY "service role manages" ON public.snaptrade_connections
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TABLE IF NOT EXISTS public.snaptrade_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES public.snaptrade_connections(id) ON DELETE CASCADE,
  snaptrade_account_id TEXT NOT NULL UNIQUE,
  account_number TEXT,
  account_name TEXT,
  institution_name TEXT,
  account_category TEXT,
  raw_type TEXT,
  balance_total NUMERIC,
  balance_currency TEXT,
  is_paper BOOLEAN NOT NULL DEFAULT false,
  status TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_snaptrade_accounts_user ON public.snaptrade_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_snaptrade_accounts_connection ON public.snaptrade_accounts(connection_id);
ALTER TABLE public.snaptrade_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own" ON public.snaptrade_accounts;
CREATE POLICY "users read own" ON public.snaptrade_accounts
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "service role manages" ON public.snaptrade_accounts;
CREATE POLICY "service role manages" ON public.snaptrade_accounts
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
