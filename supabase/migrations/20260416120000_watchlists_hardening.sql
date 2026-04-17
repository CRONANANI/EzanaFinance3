-- Watchlist hardening (20260416120000)
--
-- Two follow-up fixes on top of 20260415000000_user_watchlists.sql:
--
--   1. Enforce a per-user unique label so duplicate names return a clean 409
--      instead of silently creating multiple rows with the same title.
--      The API layer maps Postgres `23505 unique_violation` to
--      HTTP 409 with a user-friendly message.
--
--   2. Auto-update `updated_at` whenever a watchlist row changes. The column
--      existed but was never being bumped on rename, so the client's
--      "order by updated_at desc" rail was wrong.

-- 1. Unique index on (user_id, label)
--    Use a partial index-style CREATE UNIQUE INDEX so we can IF NOT EXISTS.
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'user_watchlists_user_label_unique'
  ) then
    create unique index user_watchlists_user_label_unique
      on public.user_watchlists (user_id, label);
  end if;
end $$;

-- 2. updated_at auto-bump trigger
create or replace function public.touch_user_watchlists_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_watchlists_touch_updated_at on public.user_watchlists;
create trigger user_watchlists_touch_updated_at
  before update on public.user_watchlists
  for each row
  execute function public.touch_user_watchlists_updated_at();
