-- Per-User Plaid Brokerage Integration
-- Run this in Supabase Dashboard → SQL Editor
-- Creates 4 tables with RLS policies for per-user portfolio data

-- plaid_items: one row per brokerage connection per user
CREATE TABLE IF NOT EXISTS plaid_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  institution_logo TEXT,
  status TEXT DEFAULT 'active',
  error_code TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plaid_items_user_id ON plaid_items(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_items_status ON plaid_items(status);

-- plaid_accounts: individual accounts within a connection
CREATE TABLE IF NOT EXISTS plaid_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_item_id UUID NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL UNIQUE,
  name TEXT,
  official_name TEXT,
  type TEXT,
  subtype TEXT,
  mask TEXT,
  balance_current NUMERIC,
  balance_available NUMERIC,
  balance_limit NUMERIC,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plaid_accounts_user_id ON plaid_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_accounts_plaid_item_id ON plaid_accounts(plaid_item_id);

-- plaid_holdings: stock/ETF/fund positions (the actual portfolio)
CREATE TABLE IF NOT EXISTS plaid_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  security_id TEXT,
  ticker TEXT,
  name TEXT,
  type TEXT,
  quantity NUMERIC,
  price NUMERIC,
  value NUMERIC,
  cost_basis NUMERIC,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plaid_holdings_user_id ON plaid_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_holdings_account_id ON plaid_holdings(account_id);
CREATE INDEX IF NOT EXISTS idx_plaid_holdings_ticker ON plaid_holdings(ticker);

-- plaid_transactions: buy/sell/dividend activity
CREATE TABLE IF NOT EXISTS plaid_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID,
  transaction_id TEXT NOT NULL UNIQUE,
  ticker TEXT,
  name TEXT,
  amount NUMERIC,
  date DATE,
  type TEXT,
  subtype TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plaid_transactions_user_id ON plaid_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_plaid_transactions_ticker ON plaid_transactions(ticker);

-- RLS: users can only see their own data
ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plaid_items_user_policy ON plaid_items;
CREATE POLICY plaid_items_user_policy ON plaid_items
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS plaid_accounts_user_policy ON plaid_accounts;
CREATE POLICY plaid_accounts_user_policy ON plaid_accounts
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS plaid_holdings_user_policy ON plaid_holdings;
CREATE POLICY plaid_holdings_user_policy ON plaid_holdings
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS plaid_transactions_user_policy ON plaid_transactions;
CREATE POLICY plaid_transactions_user_policy ON plaid_transactions
  FOR ALL USING (auth.uid() = user_id);
