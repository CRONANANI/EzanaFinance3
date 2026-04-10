-- Optional demo: seed learning badges for a known demo account (no-op if user missing).
INSERT INTO public.user_learning_badges (user_id, badge_key)
SELECT u.id, v.badge_key
FROM auth.users u
CROSS JOIN (VALUES
  ('stocks_level_foundation'),
  ('stocks_level_analyst'),
  ('crypto_level_foundation'),
  ('crypto_level_analyst'),
  ('betting_level_foundation'),
  ('risk_level_foundation')
) AS v(badge_key)
WHERE lower(u.email) = lower('axmabeto@gmail.com')
ON CONFLICT (user_id, badge_key) DO NOTHING;
