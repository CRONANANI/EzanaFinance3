-- XP rewards, tiers, sweepstakes metadata (Ezana rewards program)

CREATE TABLE IF NOT EXISTS user_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_xp INTEGER DEFAULT 0 NOT NULL,
  trading_credit_balance DECIMAL(10,2) DEFAULT 0,
  sweepstakes_entries INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'bronze',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS xp_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_created ON xp_transactions(user_id, created_at DESC);

ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own rewards" ON user_rewards;
CREATE POLICY "Users own rewards" ON user_rewards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own xp" ON xp_transactions;
CREATE POLICY "Users own xp" ON xp_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
