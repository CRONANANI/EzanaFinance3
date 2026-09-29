-- Referral program: every account gets a permanent 8-character code. When 5
-- distinct new accounts sign up with it AND verify their email, the referrer
-- gets 12 months of Personal Advanced free; each referee gets 1 month of
-- Personal free once verified.
--
-- Plan keys are the real ones from src/config/pricing.js:
--   personal_monthly           ("Personal")          referee reward
--   personal_advanced_monthly  ("Personal Advanced") referrer reward
--
-- Confirmation keys off public.profiles.email_verified, NOT
-- auth.users.email_confirmed_at: Supabase "Confirm email" is off in this
-- project and verification is the 6-digit code flow
-- (/api/auth/verify-code sets profiles.email_verified = true), so
-- email_confirmed_at is set at sign-up and would count unverified accounts.
--
-- Additive and idempotent. NOT applied by CI or by Claude: apply manually in
-- the SQL Editor.

create extension if not exists pgcrypto;

-- ── codes: one per user ──────────────────────────────────────────────────
create table if not exists public.referral_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  code text not null unique check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  created_at timestamptz not null default now()
);

-- ── referrals: one row per referee ───────────────────────────────────────
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referee_id uuid not null unique references auth.users(id) on delete cascade,
  code text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected')),
  referee_reward_granted_at timestamptz,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  constraint referrals_no_self check (referrer_id <> referee_id)
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id, status);

-- ── rewards ledger ───────────────────────────────────────────────────────
-- `tier` leaves room for repeat tiers later; v1 grants tier 1 once.
create table if not exists public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('referrer_advanced_12mo', 'referee_personal_1mo')),
  tier int not null default 1,
  plan text not null check (plan in ('personal_monthly', 'personal_advanced_monthly')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  stripe_coupon_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);
create unique index if not exists referral_rewards_one_per_kind_tier
  on public.referral_rewards (user_id, kind, tier);
create index if not exists referral_rewards_active_idx
  on public.referral_rewards (user_id, ends_at desc);

-- ── RLS: read your own rows; no client writes (service role only) ───────
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_rewards enable row level security;

revoke insert, update, delete on public.referral_codes from anon, authenticated;
revoke insert, update, delete on public.referrals from anon, authenticated;
revoke insert, update, delete on public.referral_rewards from anon, authenticated;
grant select on public.referral_codes, public.referrals, public.referral_rewards to authenticated;

drop policy if exists "own code read" on public.referral_codes;
create policy "own code read" on public.referral_codes
  for select using (auth.uid() = user_id);

drop policy if exists "own referrals read" on public.referrals;
create policy "own referrals read" on public.referrals
  for select using (auth.uid() = referrer_id or auth.uid() = referee_id);

drop policy if exists "own rewards read" on public.referral_rewards;
create policy "own rewards read" on public.referral_rewards
  for select using (auth.uid() = user_id);

-- ── code generator (unambiguous alphabet: no 0/O/1/I) ────────────────────
create or replace function public.generate_referral_code() returns text
language plpgsql volatile as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := gen_random_bytes(8);
  out text := '';
  i int;
begin
  for i in 0..7 loop
    out := out || substr(alphabet, 1 + (get_byte(bytes, i) % length(alphabet)), 1);
  end loop;
  return out;
end $$;

-- Give a user a code (retry on collision). Idempotent per user.
create or replace function public.ensure_referral_code_for(p_user uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text; tries int := 0;
begin
  select code into c from public.referral_codes where user_id = p_user;
  if found then return c; end if;
  loop
    c := public.generate_referral_code();
    begin
      insert into public.referral_codes (user_id, code) values (p_user, c);
      return c;
    exception when unique_violation then
      select code into c from public.referral_codes where user_id = p_user;
      if found then return c; end if;
      tries := tries + 1;
      if tries > 5 then raise; end if;
    end;
  end loop;
end $$;

create or replace function public.ensure_referral_code() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.ensure_referral_code_for(new.id);
  return new;
end $$;

drop trigger if exists on_auth_user_created_referral_code on auth.users;
create trigger on_auth_user_created_referral_code
  after insert on auth.users
  for each row execute function public.ensure_referral_code();

-- Backfill existing users.
do $$
declare u record;
begin
  for u in
    select au.id from auth.users au
    left join public.referral_codes rc on rc.user_id = au.id
    where rc.user_id is null
  loop
    perform public.ensure_referral_code_for(u.id);
  end loop;
end $$;

-- ── confirmation + rewards ───────────────────────────────────────────────
-- Confirms the referee's pending referral, grants the referee a month of
-- Personal, and grants the referrer 12 months of Personal Advanced at the
-- 5th confirmed referral (once: the unique index makes it idempotent).
create or replace function public.confirm_referral(p_referee uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r public.referrals%rowtype; confirmed_count int;
begin
  select * into r from public.referrals
    where referee_id = p_referee and status = 'pending'
    for update;
  if not found then return; end if;

  update public.referrals
    set status = 'confirmed', confirmed_at = now(), referee_reward_granted_at = now()
    where id = r.id;

  insert into public.referral_rewards (user_id, kind, plan, ends_at)
    values (r.referee_id, 'referee_personal_1mo', 'personal_monthly', now() + interval '1 month')
    on conflict (user_id, kind, tier) do nothing;

  select count(*) into confirmed_count
    from public.referrals where referrer_id = r.referrer_id and status = 'confirmed';
  if confirmed_count >= 5 then
    insert into public.referral_rewards (user_id, kind, plan, ends_at)
      values (r.referrer_id, 'referrer_advanced_12mo', 'personal_advanced_monthly',
              now() + interval '12 months')
      on conflict (user_id, kind, tier) do nothing;
  end if;
end $$;

revoke all on function public.confirm_referral(uuid) from public, anon, authenticated;
grant execute on function public.confirm_referral(uuid) to service_role;
revoke all on function public.ensure_referral_code_for(uuid) from public, anon, authenticated;
grant execute on function public.ensure_referral_code_for(uuid) to service_role;

create or replace function public.on_profile_email_verified_referral() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(old.email_verified, false) = false and new.email_verified = true then
    perform public.confirm_referral(new.id);
  end if;
  return new;
end $$;

drop trigger if exists on_profile_email_verified_referral on public.profiles;
create trigger on_profile_email_verified_referral
  after update of email_verified on public.profiles
  for each row execute function public.on_profile_email_verified_referral();
