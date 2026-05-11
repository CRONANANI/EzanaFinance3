-- Ezana Echo Publishing — Partner Articles + Author Subscriptions + Writer Applications
-- Run in Supabase SQL Editor

-- 1. echo_articles — blog posts with status workflow
CREATE TABLE IF NOT EXISTS echo_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  article_title TEXT NOT NULL,
  article_slug TEXT NOT NULL UNIQUE,
  article_excerpt TEXT,
  article_body TEXT NOT NULL,
  article_category TEXT DEFAULT 'Markets',
  cover_image_url TEXT,
  article_status TEXT NOT NULL DEFAULT 'draft' CHECK (article_status IN ('draft', 'submitted', 'published', 'rejected')),
  read_time_minutes INT DEFAULT 1,
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  submitted_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_echo_articles_author ON echo_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_echo_articles_status ON echo_articles(article_status);
CREATE INDEX IF NOT EXISTS idx_echo_articles_slug ON echo_articles(article_slug);
CREATE INDEX IF NOT EXISTS idx_echo_articles_published ON echo_articles(published_at) WHERE article_status = 'published';

-- RLS
ALTER TABLE echo_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published articles"
  ON echo_articles FOR SELECT
  USING (article_status = 'published');

CREATE POLICY "Authors can manage own articles"
  ON echo_articles FOR ALL
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- 2. echo_subscriptions — user subscribes to author
CREATE TABLE IF NOT EXISTS echo_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscriber_id, author_id)
);

CREATE INDEX IF NOT EXISTS idx_echo_subscriptions_subscriber ON echo_subscriptions(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_echo_subscriptions_author ON echo_subscriptions(author_id);

-- RLS
ALTER TABLE echo_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions"
  ON echo_subscriptions FOR ALL
  USING (auth.uid() = subscriber_id)
  WITH CHECK (auth.uid() = subscriber_id);

-- 3. echo_writer_applications — partner applies to write
CREATE TABLE IF NOT EXISTS echo_writer_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  applicant_name TEXT,
  applicant_email TEXT,
  writing_experience TEXT NOT NULL,
  sample_urls TEXT,
  specialization TEXT,
  reason_to_write TEXT,
  portfolio_url TEXT,
  application_status TEXT NOT NULL DEFAULT 'pending' CHECK (application_status IN ('pending', 'approved', 'rejected')),
  reviewer_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_echo_writer_applications_user ON echo_writer_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_echo_writer_applications_status ON echo_writer_applications(application_status);

-- RLS
ALTER TABLE echo_writer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own application"
  ON echo_writer_applications FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Add echo_writer_approved to partners table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'echo_writer_approved'
  ) THEN
    ALTER TABLE partners ADD COLUMN echo_writer_approved BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'echo_writer_approved_at'
  ) THEN
    ALTER TABLE partners ADD COLUMN echo_writer_approved_at TIMESTAMPTZ;
  END IF;
END $$;
