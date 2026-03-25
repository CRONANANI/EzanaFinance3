-- Extended partner badge definitions (gamification-style) + optional seed for contact@ezana.world
-- Uses existing public.badge_definitions + public.partner_badges (partner_id = auth user id)

INSERT INTO badge_definitions (id, badge_category, badge_name, badge_icon, badge_description, tier, tier_name, tier_color, sort_order) VALUES
  ('first_trade', 'Trading', 'First Trade', '🎯', 'Completed your first trade', 1, 'Common', '#9CA3AF', 200),
  ('ten_trades', 'Trading', '10 Trades', '📈', 'Completed 10 trades', 1, 'Common', '#9CA3AF', 201),
  ('fifty_trades', 'Trading', '50 Trades', '🔥', 'Completed 50 trades', 2, 'Rare', '#3B82F6', 202),
  ('hundred_trades', 'Trading', '100 Trades', '💎', 'Completed 100 trades', 3, 'Epic', '#A855F7', 203),
  ('first_profit', 'Trading', 'First Profit', '💰', 'Made your first profitable trade', 1, 'Common', '#9CA3AF', 204),
  ('ten_percent_return', 'Milestone', '10% Return', '🚀', 'Achieved 10% portfolio return', 2, 'Rare', '#3B82F6', 205),
  ('twenty_five_percent', 'Milestone', '25% Return', '⭐', 'Achieved 25% portfolio return', 3, 'Epic', '#A855F7', 206),
  ('fifty_percent', 'Milestone', '50% Return', '🏆', 'Achieved 50% portfolio return', 4, 'Legendary', '#F59E0B', 207),
  ('first_referral', 'Community', 'First Referral', '🤝', 'Referred your first user', 1, 'Common', '#9CA3AF', 208),
  ('five_referrals', 'Community', '5 Referrals', '🌟', 'Referred 5 users', 2, 'Rare', '#3B82F6', 209),
  ('ten_referrals', 'Community', '10 Referrals', '👑', 'Referred 10 users', 3, 'Epic', '#A855F7', 210),
  ('community_post', 'Community', 'Community Voice', '💬', 'Made your first community post', 1, 'Common', '#9CA3AF', 211),
  ('streak_7', 'Milestone', '7-Day Streak', '🔥', 'Logged in 7 days in a row', 1, 'Common', '#9CA3AF', 212),
  ('streak_30', 'Milestone', '30-Day Streak', '⚡', 'Logged in 30 days in a row', 2, 'Rare', '#3B82F6', 213),
  ('streak_100', 'Milestone', '100-Day Streak', '🌋', 'Logged in 100 days in a row', 4, 'Legendary', '#F59E0B', 214),
  ('early_adopter', 'Achievement', 'Early Adopter', '🏅', 'Joined during the platform launch', 3, 'Epic', '#A855F7', 215),
  ('verified_partner_badge', 'Achievement', 'Verified Partner', '✅', 'Verified partner status', 2, 'Rare', '#3B82F6', 216),
  ('top_performer', 'Achievement', 'Top Performer', '🥇', 'Ranked in the top 10 on the leaderboard', 4, 'Legendary', '#F59E0B', 217),
  ('diversified', 'Trading', 'Diversified', '🎨', 'Held positions in 5+ sectors', 1, 'Common', '#9CA3AF', 218),
  ('watchlist_pro', 'Trading', 'Watchlist Pro', '👁️', 'Added 20+ stocks to watchlists', 1, 'Common', '#9CA3AF', 219),
  ('congress_tracker', 'Trading', 'Congress Tracker', '🏛️', 'Followed 10+ politicians', 2, 'Rare', '#3B82F6', 220),
  ('night_owl', 'Achievement', 'Night Owl', '🦉', 'Made a trade after midnight', 1, 'Common', '#9CA3AF', 221),
  ('market_opener', 'Achievement', 'Market Opener', '🔔', 'Placed a trade within 5 minutes of market open', 2, 'Rare', '#3B82F6', 222),
  ('globe_trotter', 'Achievement', 'Globe Trotter', '🌍', 'Viewed market analysis for 10+ cities', 2, 'Rare', '#3B82F6', 223)
ON CONFLICT (id) DO NOTHING;

-- Assign every badge definition to contact@ezana.world for QA (idempotent)
DO $$
DECLARE
  partner_user_id UUID;
BEGIN
  SELECT id INTO partner_user_id FROM auth.users WHERE email = 'contact@ezana.world' LIMIT 1;

  IF partner_user_id IS NOT NULL THEN
    INSERT INTO partner_badges (partner_id, badge_id)
    SELECT partner_user_id, bd.id FROM badge_definitions bd
    ON CONFLICT (partner_id, badge_id) DO NOTHING;
  END IF;
END $$;
