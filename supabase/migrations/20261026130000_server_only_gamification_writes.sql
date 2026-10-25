-- QA RET-10 / RET-14: users can no longer write their own mock portfolio,
-- trade log, course progress or learning badges straight through PostgREST.
--
-- Live (read-only check, 2026-10-25) every one of these tables had an owner
-- FOR ALL policy (mock_trades: owner INSERT), so a browser could set any cash
-- balance, invent trades, or self-grant passed quizzes and badges that feed
-- ELO, XP and the leaderboards.
--
-- After this migration the owner can only SELECT. All writes go through the
-- API with the service role, after the route authenticates the caller and
-- scopes every write to that caller's id:
--   mock_portfolios       POST /api/mock-trades (server-priced), POST /api/mock-portfolio ({action:'reset'})
--   mock_trades           POST /api/mock-trades
--   user_course_progress  POST /api/learning/progress
--   user_learning_badges  POST /api/learning/progress (after server quiz grading)
--
-- SHIP THE CODE FIRST: apply only after the commit that moves those writes to
-- getAdminClient() is deployed, or trades and course progress fail to save.
-- Idempotent: drop policy if exists + create.

-- mock_portfolios -------------------------------------------------------
alter table public.mock_portfolios enable row level security;
drop policy if exists "Users manage own mock portfolio" on public.mock_portfolios;
drop policy if exists "mock_portfolios owner select" on public.mock_portfolios;
create policy "mock_portfolios owner select" on public.mock_portfolios
  for select to authenticated using (auth.uid() = user_id);

-- mock_trades -----------------------------------------------------------
alter table public.mock_trades enable row level security;
drop policy if exists "Users insert own mock trades" on public.mock_trades;
-- "Users read own mock trades" (owner SELECT) stays as is.

-- user_course_progress --------------------------------------------------
alter table public.user_course_progress enable row level security;
drop policy if exists "Users own course progress" on public.user_course_progress;
drop policy if exists "user_course_progress owner select" on public.user_course_progress;
create policy "user_course_progress owner select" on public.user_course_progress
  for select to authenticated using (auth.uid() = user_id);

-- user_learning_badges --------------------------------------------------
alter table public.user_learning_badges enable row level security;
drop policy if exists "Users own learning badges" on public.user_learning_badges;
drop policy if exists "user_learning_badges owner select" on public.user_learning_badges;
create policy "user_learning_badges owner select" on public.user_learning_badges
  for select to authenticated using (auth.uid() = user_id);

-- Verification (read-only): expect only SELECT policies on all four tables.
--   select tablename, policyname, cmd from pg_policies
--    where schemaname = 'public'
--      and tablename in ('mock_portfolios','mock_trades','user_course_progress','user_learning_badges')
--    order by tablename;
