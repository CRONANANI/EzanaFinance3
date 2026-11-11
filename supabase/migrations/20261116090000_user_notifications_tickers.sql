-- Notification tickers (Nov 2026): the symbols a notification is about,
-- shown as a chip row on the redesigned notifications panel. Optional, at
-- most 5; existing rows and inserts keep working (default '{}').
-- Additive and idempotent. Already applied to the live project.
do $guard$
begin
  if to_regclass('public.user_notifications') is null then
    return;
  end if;
  alter table public.user_notifications
    add column if not exists tickers text[] not null default '{}';
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.user_notifications'::regclass
       and conname = 'user_notifications_tickers_max'
  ) then
    alter table public.user_notifications
      add constraint user_notifications_tickers_max check (cardinality(tickers) <= 5);
  end if;
end
$guard$;
