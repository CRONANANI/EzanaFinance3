-- /api/news/alpha-vantage/poll has failed on every run since June because
-- public.news_articles_cache has no source_api column. Additive and
-- idempotent. NOT applied by CI or by Claude: apply manually in the SQL Editor.
alter table public.news_articles_cache add column if not exists source_api text;
