-- Ezana Finance PostgreSQL Schema
-- Run this to create the database structure

-- Users (synced from Firebase)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Portfolios
CREATE TABLE IF NOT EXISTS portfolios (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  account_id VARCHAR(255) UNIQUE NOT NULL,
  institution_name VARCHAR(255),
  account_type VARCHAR(50), -- 'brokerage', 'retirement', 'bank'
  total_value DECIMAL(15, 2) DEFAULT 0,
  cash_balance DECIMAL(15, 2) DEFAULT 0,
  cost_basis DECIMAL(15, 2) DEFAULT 0,
  total_return DECIMAL(15, 2),
  total_return_percent DECIMAL(8, 4),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_synced TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);

-- Holdings
CREATE TABLE IF NOT EXISTS holdings (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol VARCHAR(10) NOT NULL,
  security_name VARCHAR(255),
  quantity DECIMAL(15, 6) NOT NULL,
  cost_basis DECIMAL(15, 2),
  current_price DECIMAL(15, 2),
  current_value DECIMAL(15, 2),
  total_return DECIMAL(15, 2),
  total_return_percent DECIMAL(8, 4),
  sector VARCHAR(100),
  asset_class VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_holdings_portfolio_id ON holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_holdings_symbol ON holdings(symbol);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  portfolio_id INTEGER REFERENCES portfolios(id) ON DELETE CASCADE,
  transaction_id VARCHAR(255) UNIQUE,
  symbol VARCHAR(10),
  transaction_type VARCHAR(20), -- 'buy', 'sell', 'dividend', 'transfer'
  quantity DECIMAL(15, 6),
  price DECIMAL(15, 2),
  amount DECIMAL(15, 2),
  fees DECIMAL(15, 2),
  transaction_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_id ON transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_transactions_symbol ON transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);

-- Price History (for charting)
CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  open DECIMAL(15, 2),
  high DECIMAL(15, 2),
  low DECIMAL(15, 2),
  close DECIMAL(15, 2),
  volume BIGINT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_price_history_symbol_date ON price_history(symbol, date DESC);

-- Congressional Trades
CREATE TABLE IF NOT EXISTS congressional_trades (
  id SERIAL PRIMARY KEY,
  politician_name VARCHAR(255) NOT NULL,
  office VARCHAR(100),
  party VARCHAR(50),
  symbol VARCHAR(10),
  transaction_type VARCHAR(20),
  amount_range VARCHAR(100),
  transaction_date DATE,
  filing_date DATE,
  source VARCHAR(50) DEFAULT 'QuiverQuant',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(politician_name, symbol, transaction_date, filing_date)
);

CREATE INDEX IF NOT EXISTS idx_congress_trades_symbol ON congressional_trades(symbol);
CREATE INDEX IF NOT EXISTS idx_congress_trades_date ON congressional_trades(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_congress_trades_politician ON congressional_trades(politician_name);

-- Watchlists
CREATE TABLE IF NOT EXISTS watchlists (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  symbols TEXT[], -- Array of symbols
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON watchlists(user_id);

-- =========================================
-- Additional performance indexes
-- =========================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(portfolio_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_congress_ticker_date ON congressional_trades(symbol, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_holdings_portfolio_symbol ON holdings(portfolio_id, symbol);

-- =========================================
-- User Subscriptions (Stripe integration)
-- =========================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  plan_id VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- =========================================
-- User Alert Preferences
-- =========================================
CREATE TABLE IF NOT EXISTS alert_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, alert_type)
);

CREATE INDEX IF NOT EXISTS idx_alert_prefs_user ON alert_preferences(user_id);

-- =========================================
-- Cached Economic Data (FRED snapshots)
-- =========================================
CREATE TABLE IF NOT EXISTS economic_indicators (
  id SERIAL PRIMARY KEY,
  series_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  value DECIMAL(20, 6),
  fetched_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(series_id, date)
);

CREATE INDEX IF NOT EXISTS idx_econ_series_date ON economic_indicators(series_id, date DESC);

-- =========================================
-- Insider Trading Cache
-- =========================================
CREATE TABLE IF NOT EXISTS insider_trades (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  insider_name VARCHAR(255),
  title VARCHAR(255),
  transaction_type VARCHAR(50),
  shares DECIMAL(15, 2),
  price DECIMAL(15, 2),
  value DECIMAL(15, 2),
  transaction_date DATE,
  filing_date DATE,
  source VARCHAR(50) DEFAULT 'FMP',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(symbol, insider_name, transaction_date, transaction_type)
);

CREATE INDEX IF NOT EXISTS idx_insider_symbol ON insider_trades(symbol);
CREATE INDEX IF NOT EXISTS idx_insider_date ON insider_trades(transaction_date DESC);

-- =========================================
-- Analytics Events (for Mixpanel/Amplitude fallback)
-- =========================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  event_name VARCHAR(100) NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(created_at DESC);
