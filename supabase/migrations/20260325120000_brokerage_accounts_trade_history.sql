-- Brokerage accounts (Alpaca Broker API) + trade history for /api/trading/*
-- Safe to run if tables already exist in Supabase (IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS brokerage_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alpaca_account_id TEXT NOT NULL,
  alpaca_account_number TEXT,
  account_status TEXT DEFAULT 'SUBMITTED',
  kyc_status TEXT,
  application_submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_brokerage_accounts_user_id ON brokerage_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_brokerage_accounts_alpaca_id ON brokerage_accounts(alpaca_account_id);

ALTER TABLE brokerage_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own brokerage account" ON brokerage_accounts;
CREATE POLICY "Users can view own brokerage account"
  ON brokerage_accounts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own brokerage account" ON brokerage_accounts;
CREATE POLICY "Users can insert own brokerage account"
  ON brokerage_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own brokerage account" ON brokerage_accounts;
CREATE POLICY "Users can update own brokerage account"
  ON brokerage_accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS trade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alpaca_order_id TEXT,
  symbol TEXT,
  side TEXT,
  qty TEXT,
  notional TEXT,
  order_type TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_history_user_id ON trade_history(user_id);

ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own trade history" ON trade_history;
CREATE POLICY "Users can view own trade history"
  ON trade_history FOR SELECT
  USING (auth.uid() = user_id);
