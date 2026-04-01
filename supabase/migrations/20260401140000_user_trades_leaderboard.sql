-- Social trading: public user_trades, bookmarks, leaderboard snapshots
-- Safe to re-run: IF NOT EXISTS guards

-- ── Profile columns (username, avatar, privacy for trades/leaderboard) ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'privacy_show_trades'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN privacy_show_trades BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'privacy_show_holdings'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN privacy_show_holdings BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'privacy_show_activity'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN privacy_show_activity BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'privacy_show_watchlist'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN privacy_show_watchlist BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'privacy_show_on_leaderboard'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN privacy_show_on_leaderboard BOOLEAN DEFAULT true;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_username_lower ON public.profiles (lower(username));

-- ── user_trades ──
CREATE TABLE IF NOT EXISTS public.user_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  trade_type text NOT NULL DEFAULT 'option' CHECK (trade_type IN ('option', 'stock', 'crypto')),
  expiry_date date,
  strike_price numeric,
  option_type text CHECK (option_type IN ('call', 'put')),
  entry_price numeric NOT NULL,
  current_price numeric,
  exit_price numeric,
  quantity numeric DEFAULT 1,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'partial_exit')),
  pnl_percent numeric,
  pnl_amount numeric,
  risk_level text DEFAULT 'moderate' CHECK (risk_level IN ('conservative', 'moderate', 'aggressive', 'degen')),
  risk_reward_ratio numeric,
  notes text,
  chart_image_url text,
  tags text[] DEFAULT '{}',
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_trades ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_trades' AND policyname = 'Public trades viewable when privacy on'
  ) THEN
    CREATE POLICY "Public trades viewable when privacy on" ON public.user_trades
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = user_trades.user_id
          AND COALESCE(profiles.privacy_show_trades, true) = true
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_trades' AND policyname = 'Users select own trades'
  ) THEN
    CREATE POLICY "Users select own trades" ON public.user_trades
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_trades' AND policyname = 'Users insert own trades'
  ) THEN
    CREATE POLICY "Users insert own trades" ON public.user_trades
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_trades' AND policyname = 'Users update own trades'
  ) THEN
    CREATE POLICY "Users update own trades" ON public.user_trades
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_trades' AND policyname = 'Users delete own trades'
  ) THEN
    CREATE POLICY "Users delete own trades" ON public.user_trades
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_trades_user_id ON public.user_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trades_ticker ON public.user_trades(ticker);
CREATE INDEX IF NOT EXISTS idx_user_trades_status ON public.user_trades(status);
CREATE INDEX IF NOT EXISTS idx_user_trades_created_at ON public.user_trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_trades_opened_at ON public.user_trades(opened_at DESC);

-- ── Bookmarks: saved trades (not community post_saves) ──
CREATE TABLE IF NOT EXISTS public.user_trade_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id uuid NOT NULL REFERENCES public.user_trades(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, trade_id)
);

ALTER TABLE public.user_trade_bookmarks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_trade_bookmarks' AND policyname = 'Manage own trade bookmarks'
  ) THEN
    CREATE POLICY "Manage own trade bookmarks" ON public.user_trade_bookmarks
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_trade_bookmarks' AND policyname = 'Read bookmarks for public profiles'
  ) THEN
    CREATE POLICY "Read bookmarks for public profiles" ON public.user_trade_bookmarks
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = user_trade_bookmarks.user_id
          AND COALESCE((p.user_settings->>'privacy_show_profile')::boolean, true) = true
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_trade_bookmarks_user ON public.user_trade_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trade_bookmarks_trade ON public.user_trade_bookmarks(trade_id);

-- ── Leaderboard snapshots (rank history) ──
CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period IN ('all_time', 'year', 'month', 'week')),
  rank integer NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  win_rate numeric,
  avg_gain numeric,
  avg_return numeric,
  avg_max numeric,
  active_trades integer DEFAULT 0,
  total_trades integer DEFAULT 0,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, period, snapshot_date)
);

ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'leaderboard_snapshots' AND policyname = 'Leaderboard snapshots are public read'
  ) THEN
    CREATE POLICY "Leaderboard snapshots are public read" ON public.leaderboard_snapshots
      FOR SELECT USING (true);
  END IF;
END $$;
-- Inserts use service role in API (bypasses RLS)

CREATE INDEX IF NOT EXISTS idx_leaderboard_period_date ON public.leaderboard_snapshots(period, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user_period ON public.leaderboard_snapshots(user_id, period);

-- updated_at touch
CREATE OR REPLACE FUNCTION public.set_user_trades_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_trades_updated ON public.user_trades;
CREATE TRIGGER trg_user_trades_updated
  BEFORE UPDATE ON public.user_trades
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_user_trades_updated_at();
