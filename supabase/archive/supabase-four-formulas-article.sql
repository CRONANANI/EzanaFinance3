-- Polymarket Trading Formulas Article
-- Run in Supabase SQL Editor
-- Replace 'contact@ezana.world' with your admin/editor email if different

INSERT INTO echo_articles (
  author_id, author_name, article_title, article_slug,
  article_excerpt, article_body, article_category,
  article_status, read_time_minutes, published_at, created_at
)
SELECT
  id,
  'Ezana Finance Editorial',
  'The 4 Formulas That Separate Winning Prediction Market Traders From Everyone Else',
  'four-formulas-prediction-market-trading',
  'The top 0.04% of prediction market wallets capture 70% of all profits. The difference is not information or capital — it is four mathematical formulas and the discipline to use them.',
  '<!-- interactive: rendered by dedicated page component -->',
  'Trading',
  'published',
  12,
  NOW(),
  NOW()
FROM auth.users
WHERE email = 'contact@ezana.world'
LIMIT 1;
