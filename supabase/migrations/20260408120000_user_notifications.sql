-- User-specific in-app notifications (Nav bell)
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  content text,
  type text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists user_notifications_user_id_created_at_idx
  on public.user_notifications (user_id, created_at desc);

alter table public.user_notifications enable row level security;

create policy "Users select own notifications"
  on public.user_notifications for select
  using (auth.uid() = user_id);

create policy "Users update own notifications"
  on public.user_notifications for update
  using (auth.uid() = user_id);

create policy "Users delete own notifications"
  on public.user_notifications for delete
  using (auth.uid() = user_id);
