-- Learning Center hub redesign (Nov 2026).
--
-- 1. Daily quests and learning streaks become server-written. The routes
--    (/api/learning/quests/daily, /api/learning/streak) now compute quest
--    progress and streaks from the user's own rows and write with the service
--    role, and quest rewards are awarded on the server. Users keep read access
--    to their own rows but can no longer write them, so a quest cannot be
--    ticked or a streak inflated from the browser.
-- 2. An index for the LearningELO history (learning events per user, in time
--    order).
--
-- SHIP THE CODE FIRST: apply after the commit that moves these writes to the
-- service role is deployed. Additive and idempotent.

-- ---------------------------------------------------------------------------
-- 1. Owner read-only
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.user_daily_quests') is not null then
    alter table public.user_daily_quests enable row level security;
    drop policy if exists "users manage own quests" on public.user_daily_quests;
    drop policy if exists "users read own quests" on public.user_daily_quests;
    create policy "users read own quests"
      on public.user_daily_quests for select to authenticated
      using (auth.uid() = user_id);
  end if;

  if to_regclass('public.user_learning_streaks') is not null then
    alter table public.user_learning_streaks enable row level security;
    drop policy if exists "users manage own streak" on public.user_learning_streaks;
    drop policy if exists "users read own streak" on public.user_learning_streaks;
    create policy "users read own streak"
      on public.user_learning_streaks for select to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. LearningELO history
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.elo_transactions') is not null then
    create index if not exists idx_elo_transactions_user_category_time
      on public.elo_transactions (user_id, category, created_at);
  end if;
end $$;
