-- Security assessment P0 (F-01, F-02, F-03, F-11): signed-in users could
-- write their own privileged state straight from the browser with the
-- public key. This makes every privileged field server-managed.
-- Additive and idempotent. Apply by hand AFTER 20261025150100 and
-- 20261025150200 (which already make trade_history, brokerage_accounts,
-- user_rewards and xp_transactions read-only for users; repeated here so
-- this file stands alone).

-- ── F-01 profiles ────────────────────────────────────────────────────────
-- 1. Column-limited grants. The UPDATE list is every column a browser or
--    user-JWT route writes today (onboarding, settings, checklist, tours,
--    beginner level, pinned cards); nothing billing-, verification-,
--    partner- or account-state-related.
revoke insert, update on public.profiles from anon, authenticated;

grant update (
  full_name, display_name, username, avatar_url, bio, website, twitter, linkedin,
  phone, date_of_birth, country, state, city,
  user_settings, preferences, pinned_cards, investor_type, experience_level,
  privacy_show_portfolio, privacy_show_trades, privacy_show_holdings,
  privacy_show_activity, privacy_show_watchlist, privacy_show_on_leaderboard,
  investor_questionnaire, investor_questionnaire_completed, investor_profile,
  partner_questionnaire, risk_score, risk_category,
  onboarding_completed, onboarding_step, onboarded, has_seen_tutorial,
  beginner_seen, beginner_tips_pref, checklist_progress, checklist_completed,
  tours_seen, analyses_run, community_terms_accepted_at, updated_at
) on public.profiles to authenticated;

-- The OAuth callback creates a missing profile row from the browser.
grant insert (id, email, full_name, onboarding_completed, updated_at)
  on public.profiles to authenticated;

-- 2. Belt and braces: a trigger refuses privileged changes from the
--    authenticated/anon DATABASE ROLE (a PostgREST request with a user JWT),
--    whatever grants exist. Service-role routes, SECURITY DEFINER functions
--    (e.g. handle_new_user at signup) and the SQL editor run as other roles
--    and are unaffected. A user-created row also gets the auth email.
-- SECURITY INVOKER on purpose: the check reads current_user, which a
-- SECURITY DEFINER function would replace with its owner.
create or replace function public.profiles_guard_privileged()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.email_verified, false)
       or coalesce(new.is_partner, false)
       or coalesce(new.is_disabled, false)
       or coalesce(new.is_demo, false)
       or coalesce(new.legacy_user, false)
       or new.subscription_status is not null and new.subscription_status <> 'inactive'
       or new.subscription_plan is not null
       or new.subscription_id is not null
       or new.one_time_plan is not null
       or new.current_plan is not null
       or new.stripe_customer_id is not null
       or new.creator_tier is not null
       or new.partner_type is not null
       or new.deleted_at is not null
       or new.reactivation_token is not null then
      raise exception 'privileged profile fields are server-managed' using errcode = '42501';
    end if;
    new.email := coalesce(auth.jwt() ->> 'email', new.email);
    return new;
  end if;

  if new.subscription_status is distinct from old.subscription_status
     or new.subscription_plan is distinct from old.subscription_plan
     or new.subscription_id is distinct from old.subscription_id
     or new.subscription_source is distinct from old.subscription_source
     or new.current_plan is distinct from old.current_plan
     or new.current_period_end is distinct from old.current_period_end
     or new.subscription_period_end is distinct from old.subscription_period_end
     or new.one_time_plan is distinct from old.one_time_plan
     or new.one_time_plan_purchased_at is distinct from old.one_time_plan_purchased_at
     or new.plan is distinct from old.plan
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.email is distinct from old.email
     or new.email_verified is distinct from old.email_verified
     or new.is_partner is distinct from old.is_partner
     or new.partner_type is distinct from old.partner_type
     or new.partner_verified_at is distinct from old.partner_verified_at
     or new.creator_tier is distinct from old.creator_tier
     or new.is_disabled is distinct from old.is_disabled
     or new.disabled_reason is distinct from old.disabled_reason
     or new.disabled_at is distinct from old.disabled_at
     or new.deleted_at is distinct from old.deleted_at
     or new.deletion_scheduled_for is distinct from old.deletion_scheduled_for
     or new.reactivation_token is distinct from old.reactivation_token
     or new.is_demo is distinct from old.is_demo
     or new.legacy_user is distinct from old.legacy_user
     or new.legacy_number is distinct from old.legacy_number
     or new.lessons_completed_count is distinct from old.lessons_completed_count
     or new.id is distinct from old.id then
    raise exception 'privileged profile fields are server-managed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged
  before insert or update on public.profiles
  for each row execute function public.profiles_guard_privileged();

-- The two UPDATE policies had no WITH CHECK; give them one so a row can
-- never be re-pointed at another id.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "Users can update own pinned cards" on public.profiles;

-- ── F-02 partners: read-only for the partner; writes are server routes ──
drop policy if exists "Users see own partner record" on public.partners;
drop policy if exists "Users read own partner record" on public.partners;
create policy "Users read own partner record" on public.partners
  for select using (auth.uid() = user_id);
revoke insert, update, delete on public.partners from anon, authenticated;

-- ── F-03 brokerage_accounts / alpaca_accounts: read-only for the user ───
drop policy if exists "Users own brokerage" on public.brokerage_accounts;
drop policy if exists "Users can insert own brokerage account" on public.brokerage_accounts;
drop policy if exists "Users can update own brokerage account" on public.brokerage_accounts;
drop policy if exists "Users can view own brokerage account" on public.brokerage_accounts;
create policy "Users can view own brokerage account" on public.brokerage_accounts
  for select using (auth.uid() = user_id);
revoke insert, update, delete on public.brokerage_accounts from anon, authenticated;

drop policy if exists "Users see own alpaca account" on public.alpaca_accounts;
drop policy if exists "Users read own alpaca account" on public.alpaca_accounts;
create policy "Users read own alpaca account" on public.alpaca_accounts
  for select using (auth.uid() = user_id);
revoke insert, update, delete on public.alpaca_accounts from anon, authenticated;

drop policy if exists "Users own trades" on public.trade_history;
drop policy if exists "Users read own trades" on public.trade_history;
create policy "Users read own trades" on public.trade_history
  for select using (auth.uid() = user_id);
revoke insert, update, delete on public.trade_history from anon, authenticated;

-- ── F-11 user_rewards / xp_transactions: read-only (award_xp writes) ────
drop policy if exists "Users own rewards" on public.user_rewards;
drop policy if exists "Users read own rewards" on public.user_rewards;
create policy "Users read own rewards" on public.user_rewards
  for select using (auth.uid() = user_id);
revoke insert, update, delete on public.user_rewards from anon, authenticated;

drop policy if exists "Users own xp" on public.xp_transactions;
drop policy if exists "Users read own xp" on public.xp_transactions;
create policy "Users read own xp" on public.xp_transactions
  for select using (auth.uid() = user_id);
revoke insert, update, delete on public.xp_transactions from anon, authenticated;

-- ── plaid_items: server-written; the encrypted access token is never
--    readable by the user's own key (assessment §5) ───────────────────────
drop policy if exists "Users see own plaid_items" on public.plaid_items;
drop policy if exists "Users read own plaid_items" on public.plaid_items;
create policy "Users read own plaid_items" on public.plaid_items
  for select using (auth.uid() = user_id);
revoke insert, update, delete on public.plaid_items from anon, authenticated;
revoke select on public.plaid_items from anon, authenticated;
grant select (id, user_id, item_id, institution_id, institution_name, institution_logo,
              status, error_code, consent_expiration, created_at, updated_at)
  on public.plaid_items to authenticated;
