-- Watchlist price-alert notifications + Inside the Capitol rename.
--
-- 1. Allow authenticated users to INSERT their own notification rows so the
--    client-side watchlist price-alert monitor can drop alerts into the bell.
-- 2. Rename the legacy "congress" notification category to
--    "inside-the-capitol" so existing rows flow through the renamed UI tab.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_notifications'
      and policyname = 'Users insert own notifications'
  ) then
    create policy "Users insert own notifications"
      on public.user_notifications for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

update public.user_notifications
   set type = 'inside-the-capitol'
 where type = 'congress';
