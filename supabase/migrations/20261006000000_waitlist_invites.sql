-- Waitlist invites: sign-up is invite-only. An admin approves a waitlist row
-- (/admin/waitlist), which stores the SHA-256 of a one-time invite token; the
-- raw token only lives in the invite email. /api/auth/accept-invite creates
-- the account server side and marks the row joined.
--
-- ALREADY APPLIED by hand in the SQL Editor (SQL-1-waitlist-invites). The
-- original SQL-1 file was not in the repo; this file was written to match the
-- live schema as read back from production on 2026-10-06, and is idempotent.
-- Not executed by Claude.

alter table public.waitlist
  add column if not exists invite_token_hash text,
  add column if not exists invite_expires_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by text,
  add column if not exists rejected_at timestamptz,
  add column if not exists joined_at timestamptz,
  add column if not exists joined_user_id uuid;

alter table public.waitlist alter column status set default 'pending';
update public.waitlist set status = 'pending' where status is null;
alter table public.waitlist alter column status set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'waitlist_status_check') then
    alter table public.waitlist
      add constraint waitlist_status_check
      check (status = any (array['pending', 'approved', 'joined', 'rejected']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'waitlist_joined_user_id_fkey') then
    alter table public.waitlist
      add constraint waitlist_joined_user_id_fkey
      foreign key (joined_user_id) references auth.users (id) on delete set null;
  end if;
end $$;

create unique index if not exists waitlist_invite_token_hash_key
  on public.waitlist (invite_token_hash) where invite_token_hash is not null;
create index if not exists idx_waitlist_status on public.waitlist (status);
