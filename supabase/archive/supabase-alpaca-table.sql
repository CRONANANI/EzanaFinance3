-- Alpaca brokerage accounts table
-- Run this in Supabase SQL Editor to create the alpaca_accounts table

CREATE TABLE IF NOT EXISTS alpaca_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alpaca_account_id TEXT NOT NULL,
  account_status TEXT DEFAULT 'SUBMITTED',
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS: users can only see their own record
ALTER TABLE alpaca_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alpaca account"
  ON alpaca_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alpaca account"
  ON alpaca_accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alpaca account"
  ON alpaca_accounts FOR UPDATE
  USING (auth.uid() = user_id);

-- Optional: index for faster lookups
CREATE INDEX IF NOT EXISTS idx_alpaca_accounts_user_id ON alpaca_accounts(user_id);
