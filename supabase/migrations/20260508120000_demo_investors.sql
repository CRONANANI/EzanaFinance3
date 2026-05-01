-- Demo investors — watchlist holder popups (see sprint-3 spec)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_is_demo
  ON public.profiles (is_demo) WHERE is_demo = true;

CREATE TABLE IF NOT EXISTS public.demo_investor_positions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker TEXT NOT NULL,
  shares NUMERIC(20, 4) NOT NULL,
  avg_cost NUMERIC(14, 4) NOT NULL,
  portfolio_pct NUMERIC(5, 2) NOT NULL,
  days_held INT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ticker)
);

CREATE INDEX IF NOT EXISTS idx_dip_ticker ON public.demo_investor_positions (ticker);

ALTER TABLE public.demo_investor_positions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dip readable by authenticated" ON public.demo_investor_positions;
CREATE POLICY "dip readable by authenticated"
  ON public.demo_investor_positions FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.seed_demo_investor(
  p_username TEXT,
  p_full_name TEXT,
  p_email TEXT
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM public.profiles WHERE username = p_username AND is_demo = true;
  IF v_user_id IS NOT NULL THEN
    RETURN v_user_id;
  END IF;

  v_user_id := uuid_generate_v5(uuid_ns_url(), p_username);

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    aud, role
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    p_email,
    crypt(gen_random_uuid()::text, gen_salt('bf')),
    NOW(), NOW(), NOW(),
    '{"provider":"demo","providers":["demo"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name, 'is_demo', true),
    'authenticated', 'authenticated'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, username, full_name, is_partner, is_demo, created_at, updated_at)
  VALUES (v_user_id, p_username, p_full_name, true, true, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    is_partner = EXCLUDED.is_partner,
    is_demo = EXCLUDED.is_demo,
    updated_at = NOW();

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := public.seed_demo_investor('warrenbuffett', 'Warren Buffett', 'warren@demo.ezana.world');
  INSERT INTO public.demo_investor_positions (user_id, ticker, shares, avg_cost, portfolio_pct, days_held, note)
  VALUES
    (v_user_id, 'AAPL', 915000, 132.00, 21.4, 1820, 'A wonderful company at a fair price. Apple''s consumer ecosystem and capital return program make it a long-term hold.')
  ON CONFLICT (user_id, ticker) DO NOTHING;

  v_user_id := public.seed_demo_investor('charliemunger', 'Charlie Munger', 'charlie@demo.ezana.world');
  INSERT INTO public.demo_investor_positions (user_id, ticker, shares, avg_cost, portfolio_pct, days_held, note)
  VALUES
    (v_user_id, 'AAPL', 480000, 128.50, 18.2, 1650, 'It''s the best business we''ve ever found.')
  ON CONFLICT (user_id, ticker) DO NOTHING;

  v_user_id := public.seed_demo_investor('cathiewood', 'Cathie Wood', 'cathie@demo.ezana.world');
  INSERT INTO public.demo_investor_positions (user_id, ticker, shares, avg_cost, portfolio_pct, days_held, note)
  VALUES
    (v_user_id, 'AAPL', 180, 171.90, 4.2, 198, NULL),
    (v_user_id, 'NVDA', 320, 380.40, 8.6, 290, 'Foundation of the AI compute era. We expect massive operating leverage from the data center segment.')
  ON CONFLICT (user_id, ticker) DO NOTHING;

  v_user_id := public.seed_demo_investor('raydalio', 'Ray Dalio', 'ray@demo.ezana.world');
  INSERT INTO public.demo_investor_positions (user_id, ticker, shares, avg_cost, portfolio_pct, days_held, note)
  VALUES
    (v_user_id, 'AAPL', 220, 158.40, 2.8, 540, NULL),
    (v_user_id, 'MSFT', 165, 295.60, 3.9, 480, 'Diversified exposure to enterprise software. Reasonable position size in the all-weather book.')
  ON CONFLICT (user_id, ticker) DO NOTHING;

  v_user_id := public.seed_demo_investor('billgates', 'Bill Gates', 'bill@demo.ezana.world');
  INSERT INTO public.demo_investor_positions (user_id, ticker, shares, avg_cost, portfolio_pct, days_held, note)
  VALUES
    (v_user_id, 'MSFT', 38500000, 28.00, 28.5, 6200, 'Founder''s legacy position.')
  ON CONFLICT (user_id, ticker) DO NOTHING;

  v_user_id := public.seed_demo_investor('jensenhuang', 'Jensen Huang', 'jensen@demo.ezana.world');
  INSERT INTO public.demo_investor_positions (user_id, ticker, shares, avg_cost, portfolio_pct, days_held, note)
  VALUES
    (v_user_id, 'NVDA', 86000000, 12.50, 95.0, 5840, 'CEO position.')
  ON CONFLICT (user_id, ticker) DO NOTHING;

  v_user_id := public.seed_demo_investor('peterlynch', 'Peter Lynch', 'peter@demo.ezana.world');
  INSERT INTO public.demo_investor_positions (user_id, ticker, shares, avg_cost, portfolio_pct, days_held, note)
  VALUES
    (v_user_id, 'AAPL', 65, 145.60, 5.0, 720, 'Buy what you know.')
  ON CONFLICT (user_id, ticker) DO NOTHING;

  v_user_id := public.seed_demo_investor('joelgreenblatt', 'Joel Greenblatt', 'joel@demo.ezana.world');
  INSERT INTO public.demo_investor_positions (user_id, ticker, shares, avg_cost, portfolio_pct, days_held, note)
  VALUES
    (v_user_id, 'AAPL', 38, 162.80, 3.5, 240, NULL)
  ON CONFLICT (user_id, ticker) DO NOTHING;

  v_user_id := public.seed_demo_investor('emmawilson', 'Emma Wilson', 'emma@demo.ezana.world');
  UPDATE public.profiles SET is_partner = false WHERE id = v_user_id;
  INSERT INTO public.demo_investor_positions (user_id, ticker, shares, avg_cost, portfolio_pct, days_held)
  VALUES
    (v_user_id, 'AAPL', 18, 142.30, 3.2, 287),
    (v_user_id, 'NVDA', 12, 410.20, 6.8, 180),
    (v_user_id, 'MSFT', 22, 312.40, 5.4, 365)
  ON CONFLICT (user_id, ticker) DO NOTHING;

  v_user_id := public.seed_demo_investor('davidkim', 'David Kim', 'david@demo.ezana.world');
  UPDATE public.profiles SET is_partner = false WHERE id = v_user_id;
  INSERT INTO public.demo_investor_positions (user_id, ticker, shares, avg_cost, portfolio_pct, days_held)
  VALUES
    (v_user_id, 'AAPL', 42, 168.50, 7.8, 412),
    (v_user_id, 'NVDA', 30, 385.50, 11.2, 245)
  ON CONFLICT (user_id, ticker) DO NOTHING;

  v_user_id := public.seed_demo_investor('lisapark', 'Lisa Park', 'lisa@demo.ezana.world');
  UPDATE public.profiles SET is_partner = false WHERE id = v_user_id;
  INSERT INTO public.demo_investor_positions (user_id, ticker, shares, avg_cost, portfolio_pct, days_held)
  VALUES
    (v_user_id, 'AAPL', 9, 175.20, 1.5, 95),
    (v_user_id, 'MSFT', 14, 348.20, 3.1, 120)
  ON CONFLICT (user_id, ticker) DO NOTHING;

  v_user_id := public.seed_demo_investor('alexchen', 'Alex Chen', 'alex@demo.ezana.world');
  UPDATE public.profiles SET is_partner = false WHERE id = v_user_id;
  INSERT INTO public.demo_investor_positions (user_id, ticker, shares, avg_cost, portfolio_pct, days_held)
  VALUES
    (v_user_id, 'AAPL', 25, 155.80, 4.1, 365),
    (v_user_id, 'NVDA', 18, 425.80, 7.4, 150)
  ON CONFLICT (user_id, ticker) DO NOTHING;
END $$;
