-- Partner Badges & Username/Avatar Migration
-- Run in Supabase SQL Editor

-- 1. Add username and avatar_url to partners
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'username') THEN
    ALTER TABLE partners ADD COLUMN username TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'partners' AND column_name = 'avatar_url') THEN
    ALTER TABLE partners ADD COLUMN avatar_url TEXT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_username ON partners(username) WHERE username IS NOT NULL;

-- 2. badge_definitions — master list of 27 badges
CREATE TABLE IF NOT EXISTS badge_definitions (
  id TEXT PRIMARY KEY,
  badge_category TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  badge_description TEXT,
  tier INT DEFAULT 1,
  tier_name TEXT DEFAULT 'Bronze',
  tier_color TEXT DEFAULT '#cd7f32',
  sort_order INT DEFAULT 0
);

-- 3. partner_badges — earned badges per partner (partner_id = auth user id)
CREATE TABLE IF NOT EXISTS partner_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_badges_partner ON partner_badges(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_badges_badge ON partner_badges(badge_id);

ALTER TABLE partner_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can read own badges"
  ON partner_badges FOR SELECT
  USING (auth.uid() = partner_id);

-- 4. Insert 27 badge definitions
INSERT INTO badge_definitions (id, badge_category, badge_name, badge_icon, badge_description, tier, tier_name, tier_color, sort_order) VALUES
-- Status (2 badges, tier 1 for display)
('verified-partner', 'Status', 'Verified Partner', 'bi-patch-check-fill', 'Earned when your partner application is approved', 1, 'Status', '#d4a853', 1),
('echo-writer', 'Status', 'Echo Writer', 'bi-pen-fill', 'Earned when your Ezana Echo writer application is approved', 1, 'Status', '#d4a853', 2),
-- Performance (5 tiers)
('rising-tide', 'Performance', 'Rising Tide', 'bi-graph-up-arrow', 'Achieve 10% portfolio return', 1, 'Bronze', '#cd7f32', 10),
('steady-climber', 'Performance', 'Steady Climber', 'bi-graph-up-arrow', 'Achieve 25% portfolio return', 2, 'Silver', '#c0c0c0', 11),
('market-mover', 'Performance', 'Market Mover', 'bi-graph-up-arrow', 'Achieve 50% portfolio return', 3, 'Gold', '#d4a853', 12),
('elite-performer', 'Performance', 'Elite Performer', 'bi-graph-up-arrow', 'Achieve 100% portfolio return', 4, 'Platinum', '#e5e4e2', 13),
('legendary-returns', 'Performance', 'Legendary Returns', 'bi-graph-up-arrow', 'Achieve 200% portfolio return', 5, 'Diamond', '#b9f2ff', 14),
-- Content / Article Readers (5 tiers)
('first-readers', 'Content', 'First Readers', 'bi-eye-fill', '100 article reads', 1, 'Bronze', '#cd7f32', 20),
('growing-audience', 'Content', 'Growing Audience', 'bi-eye-fill', '1,000 article reads', 2, 'Silver', '#c0c0c0', 21),
('popular-author', 'Content', 'Popular Author', 'bi-eye-fill', '10,000 article reads', 3, 'Gold', '#d4a853', 22),
('viral-voice', 'Content', 'Viral Voice', 'bi-eye-fill', '50,000 article reads', 4, 'Platinum', '#e5e4e2', 23),
('echo-legend', 'Content', 'Echo Legend', 'bi-eye-fill', '100,000 article reads', 5, 'Diamond', '#b9f2ff', 24),
-- Community / Followers (5 tiers)
('getting-noticed', 'Community', 'Getting Noticed', 'bi-people-fill', '50 followers', 1, 'Bronze', '#cd7f32', 30),
('building-following', 'Community', 'Building a Following', 'bi-people-fill', '250 followers', 2, 'Silver', '#c0c0c0', 31),
('influencer', 'Community', 'Influencer', 'bi-people-fill', '1,000 followers', 3, 'Gold', '#d4a853', 32),
('community-leader', 'Community', 'Community Leader', 'bi-people-fill', '5,000 followers', 4, 'Platinum', '#e5e4e2', 33),
('finance-icon', 'Community', 'Finance Icon', 'bi-people-fill', '25,000 followers', 5, 'Diamond', '#b9f2ff', 34),
-- Education / Course Students (5 tiers)
('first-class', 'Education', 'First Class', 'bi-mortarboard-fill', '25 course students', 1, 'Bronze', '#cd7f32', 40),
('educator', 'Education', 'Educator', 'bi-mortarboard-fill', '100 course students', 2, 'Silver', '#c0c0c0', 41),
('master-teacher', 'Education', 'Master Teacher', 'bi-mortarboard-fill', '500 course students', 3, 'Gold', '#d4a853', 42),
('academy-builder', 'Education', 'Academy Builder', 'bi-mortarboard-fill', '2,000 course students', 4, 'Platinum', '#e5e4e2', 43),
('education-titan', 'Education', 'Education Titan', 'bi-mortarboard-fill', '10,000 course students', 5, 'Diamond', '#b9f2ff', 44),
-- Impact / Helped Users (5 tiers)
('helping-hand', 'Impact', 'Helping Hand', 'bi-heart-fill', '10 users achieved returns from your strategies', 1, 'Bronze', '#cd7f32', 50),
('profit-sharer', 'Impact', 'Profit Sharer', 'bi-heart-fill', '50 users achieved returns', 2, 'Silver', '#c0c0c0', 51),
('wealth-builder', 'Impact', 'Wealth Builder', 'bi-heart-fill', '200 users achieved returns', 3, 'Gold', '#d4a853', 52),
('life-changer', 'Impact', 'Life Changer', 'bi-heart-fill', '500 users achieved returns', 4, 'Platinum', '#e5e4e2', 53),
('financial-guardian', 'Impact', 'Financial Guardian', 'bi-heart-fill', '1,000 users achieved returns', 5, 'Diamond', '#b9f2ff', 54)
ON CONFLICT (id) DO NOTHING;
