-- Candidate indexes from the performance pass (Phase 6).
--
-- WRITE-ONLY. Nothing in the app runs this file. Apply it by hand in the
-- Supabase SQL Editor after reviewing each index against a real EXPLAIN on
-- production data, and drop any that the planner does not pick up.
--
-- Every index below is justified by a specific query in this repo, cited by
-- file and line. CONCURRENTLY is used so none of these locks a table on a
-- live database; that means they must be run one statement at a time, outside
-- a transaction block.
--
-- Before applying, check for an existing index that already serves the query:
--   select indexname, indexdef from pg_indexes where tablename = '<table>';

-- ---------------------------------------------------------------------------
-- 1. Sonar daily quota and the global circuit breaker.
--
-- src/app/api/sonar/query/route.js: the global cap counts every row since the
-- start of the UTC day, and the per-user quota counts one user's rows in the
-- same window. Both run on every ping, before any retrieval work, so they sit
-- directly in the latency path of the feature.
--
--   .from('sonar_queries').select(count).gte('created_at', startOfUtcDay)
--   .from('sonar_queries').select(count).eq('user_id', ...).gte('created_at', ...)
--
-- The composite serves the per-user count; the single-column serves the global
-- one. user_id first because it is an equality predicate and created_at is a
-- range: a range column placed first cannot be used to seek on the equality.
create index concurrently if not exists sonar_queries_user_created_idx
  on public.sonar_queries (user_id, created_at desc);

create index concurrently if not exists sonar_queries_created_idx
  on public.sonar_queries (created_at desc);

-- ---------------------------------------------------------------------------
-- 2. Community post interaction lookups.
--
-- src/app/api/community/posts/route.js: three reads filter by the current user
-- and an IN list of post ids. They now run in parallel, which makes the slowest
-- of the three the cost of the whole step, so all three want the same shape.
create index concurrently if not exists post_likes_user_post_idx
  on public.post_likes (user_id, post_id);

create index concurrently if not exists post_saves_user_post_idx
  on public.post_saves (user_id, post_id);

create index concurrently if not exists poll_votes_user_post_idx
  on public.poll_votes (user_id, post_id);

-- ---------------------------------------------------------------------------
-- 3. Landing Sonar fixture.
--
-- src/app/api/landing/sonar-fixture/route.js orders LMT awards by amount. The
-- route is cached daily, so this matters for the cold path rather than every
-- request, and it is listed last for that reason.
create index concurrently if not exists usaspending_awards_ticker_amount_idx
  on public.usaspending_contract_awards (ticker, award_amount desc nulls last);

-- ---------------------------------------------------------------------------
-- Deliberately NOT included:
--
--   * Indexes on profiles(id). It is the primary key; an extra index is dead
--     weight that slows every write.
--   * Anything on echo_articles for the fixture's text search. That query uses
--     the existing tsv column, which is already backed by its own index; check
--     with \d echo_articles before adding another.
