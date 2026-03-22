-- Security hardening: database indexes for queried columns
-- Run in Supabase SQL Editor

-- Partners table
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_username ON partners(username);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);

-- Echo articles
CREATE INDEX IF NOT EXISTS idx_echo_articles_author ON echo_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_echo_articles_status ON echo_articles(article_status);
CREATE INDEX IF NOT EXISTS idx_echo_articles_slug ON echo_articles(article_slug);
CREATE INDEX IF NOT EXISTS idx_echo_articles_category ON echo_articles(article_category);
CREATE INDEX IF NOT EXISTS idx_echo_articles_published ON echo_articles(published_at DESC);

-- Echo subscriptions
CREATE INDEX IF NOT EXISTS idx_echo_subs_subscriber ON echo_subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_echo_subs_author ON echo_subscriptions(author_id);

-- Partner badges
CREATE INDEX IF NOT EXISTS idx_partner_badges_partner ON partner_badges(partner_id);

-- Partner applications
CREATE INDEX IF NOT EXISTS idx_partner_apps_email ON partner_applications(email);
CREATE INDEX IF NOT EXISTS idx_partner_apps_status ON partner_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_partner_apps_token ON partner_applications(verification_token);

-- Alpaca accounts (if exists)
CREATE INDEX IF NOT EXISTS idx_alpaca_user ON alpaca_accounts(user_id);

-- Plaid items (if exists)
CREATE INDEX IF NOT EXISTS idx_plaid_user ON plaid_items(user_id);

-- Badge definitions (if exists)
CREATE INDEX IF NOT EXISTS idx_badge_defs_category ON badge_definitions(badge_category);
CREATE INDEX IF NOT EXISTS idx_badge_defs_sort ON badge_definitions(sort_order);
