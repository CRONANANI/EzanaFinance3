-- ═══════════════════════════════════════════════════════════════════
-- Message requests (Nov 2026)
--
-- Anyone can now start a conversation by username. Between friends
-- (mutual follows) it lands in the inbox as before. Otherwise the
-- conversation opens as a request the recipient accepts or declines.
--
--   status        'active'   normal inbox thread
--                 'request'  waiting on the recipient
--                 'declined' recipient said no; the requester can't
--                            send more until they become friends
--   requested_by  who opened the request (null for active threads
--                 created before this migration)
--   responded_at  when the recipient accepted or declined
--
-- Every write goes through the service-role API (/api/messages), which
-- enforces the friend and request rules, so the browser-side write
-- policies from 20260415100000_messaging.sql are dropped: left in place
-- they would let a client insert straight into a conversation, or flip
-- its own request to 'active', and skip the gate. Read policies stay
-- (Realtime needs them).
-- ═══════════════════════════════════════════════════════════════════

-- Guarded so a database without the messaging tables (the scratch test
-- database in scripts/check-reliability-sql.mjs) skips it; on the live
-- database every statement runs as written. Safe to re-run.
do $guard$
begin
  if to_regclass('public.conversations') is null then
    return;
  end if;

  alter table public.conversations
    add column if not exists status text not null default 'active',
    add column if not exists requested_by uuid references auth.users(id) on delete set null,
    add column if not exists responded_at timestamptz;

  if not exists (
    select 1 from pg_constraint where conname = 'conversations_status_check'
  ) then
    alter table public.conversations
      add constraint conversations_status_check
      check (status in ('active', 'request', 'declined'));
  end if;

  -- Existing threads were all friend-gated, so they stay active.
  update public.conversations set status = 'active' where status is null;

  -- The recipient's "Requests" list: open requests per participant.
  create index if not exists conversations_open_requests_idx
    on public.conversations (status, requested_by)
    where status = 'request';

  drop policy if exists "Users can insert conversations they participate in" on public.conversations;
  drop policy if exists "Users can update their own conversations" on public.conversations;

  if to_regclass('public.messages') is not null then
    drop policy if exists "Users can insert messages in their conversations" on public.messages;
    drop policy if exists "Users can update messages they received (mark as read)" on public.messages;
  end if;
end
$guard$;
