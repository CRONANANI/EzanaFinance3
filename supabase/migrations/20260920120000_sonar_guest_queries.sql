-- Guest Sonar pings from the landing page share the sonar_queries ledger so
-- the global daily cap and audit trail cover them. user_id becomes nullable;
-- guest rows carry is_guest and a salted ip hash (never a raw IP).
--
-- WRITE-ONLY. Apply by hand in the Supabase SQL Editor. The landing route
-- tolerates this not being applied yet: its ledger insert is non-fatal, so an
-- unapplied migration costs the audit row and the guest's share of the global
-- cap, not the ping itself.
alter table public.sonar_queries
  alter column user_id drop not null;

alter table public.sonar_queries
  add column if not exists is_guest boolean not null default false,
  add column if not exists ip_hash text;

-- Existing select-own RLS policies key on user_id = auth.uid(); guest rows
-- (user_id null) are invisible to all users, which is correct. Inserts stay
-- service-role only. No policy changes needed; this comment records the check.
