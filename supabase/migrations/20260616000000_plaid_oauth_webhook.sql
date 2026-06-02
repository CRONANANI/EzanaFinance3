-- Plaid OAuth + webhook tracking columns on plaid_items
ALTER TABLE plaid_items
  ADD COLUMN IF NOT EXISTS consent_expiration_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_webhook_code TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- statuses used by webhook handler: 'active' | 'login_required' | 'revoked'
CREATE INDEX IF NOT EXISTS idx_plaid_items_item_id ON plaid_items(item_id);
