-- Reliability audit P1 (items 5, 7, 8): atomic XP and ELO awards with
-- idempotency keys, atomic competition scoring claim, Sonar ping
-- reservation before the model call.
-- Additive and idempotent. Apply by hand after 20261026100000.

-- ── 5a. XP ────────────────────────────────────────────────────────────────
alter table public.xp_transactions add column if not exists idempotency_key text;

-- Backfill keys for awards that were already one-per-thing, keeping only
-- the EARLIEST row per (user, thing): later duplicates are history and stay
-- keyless, so the unique index below can be built.
with ranked as (
  select id,
         'checklist:' || substr(reason, length('Checklist task: ') + 1) as k,
         row_number() over (partition by user_id, reason order by created_at, id) as rn
    from public.xp_transactions
   where reason like 'Checklist task: %' and idempotency_key is null
)
update public.xp_transactions x
   set idempotency_key = r.k
  from ranked r
 where x.id = r.id and r.rn = 1;

create unique index if not exists xp_tx_idem_uq
  on public.xp_transactions (user_id, idempotency_key)
  where idempotency_key is not null;

-- Tier bands and perks (src/lib/rewards.js TIERS / TIER_PERKS).
create or replace function public.ezana_xp_tier(p_total int)
returns text language sql immutable as $$
  select case
    when p_total >= 15000 then 'diamond'
    when p_total >= 5000 then 'platinum'
    when p_total >= 2000 then 'gold'
    when p_total >= 500 then 'silver'
    else 'bronze' end;
$$;

create or replace function public.ezana_xp_tier_credit(p_tier text)
returns numeric language sql immutable as $$
  select case p_tier when 'silver' then 5 when 'gold' then 15
    when 'platinum' then 50 when 'diamond' then 100 else 0 end::numeric;
$$;

create or replace function public.ezana_xp_tier_entries(p_tier text)
returns int language sql immutable as $$
  select case p_tier when 'silver' then 1 when 'gold' then 3
    when 'platinum' then 10 when 'diamond' then 999 else 0 end;
$$;

-- One transaction: ledger row (deduped by key) + total + tier + perks.
-- On a tier change the perks GROW by the difference between the two tiers'
-- allowances, so credit a user already spent is not reset to the snapshot.
create or replace function public.award_xp(
  p_user uuid,
  p_amount int,
  p_reason text,
  p_category text,
  p_key text default null
)
returns table (total_xp int, tier text, old_tier text, awarded boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int;
  v_old_total int;
  v_old_tier text;
  v_new_total int;
  v_new_tier text;
begin
  if p_user is null or p_amount is null or p_amount = 0 then
    raise exception 'award_xp: user and nonzero amount required';
  end if;

  insert into xp_transactions (user_id, amount, reason, category, idempotency_key)
  values (p_user, p_amount, p_reason, p_category, p_key)
  on conflict (user_id, idempotency_key) where idempotency_key is not null do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return query
      select coalesce(ur.total_xp, 0), coalesce(ur.tier, 'bronze'), coalesce(ur.tier, 'bronze'), false
        from user_rewards ur where ur.user_id = p_user;
    if not found then
      return query select 0, 'bronze'::text, 'bronze'::text, false;
    end if;
    return;
  end if;

  insert into user_rewards (user_id, total_xp, tier, trading_credit_balance, sweepstakes_entries)
  values (p_user, 0, 'bronze', 0, 0)
  on conflict (user_id) do nothing;

  select coalesce(ur.total_xp, 0), coalesce(ur.tier, 'bronze')
    into v_old_total, v_old_tier
    from user_rewards ur where ur.user_id = p_user
     for update;

  v_new_total := greatest(0, v_old_total + p_amount);
  v_new_tier := ezana_xp_tier(v_new_total);

  update user_rewards ur
     set total_xp = v_new_total,
         tier = v_new_tier,
         trading_credit_balance = case when v_new_tier <> v_old_tier then
           greatest(0, coalesce(ur.trading_credit_balance, 0)
             + ezana_xp_tier_credit(v_new_tier) - ezana_xp_tier_credit(v_old_tier))
           else ur.trading_credit_balance end,
         sweepstakes_entries = case when v_new_tier <> v_old_tier then
           greatest(0, coalesce(ur.sweepstakes_entries, 0)
             + ezana_xp_tier_entries(v_new_tier) - ezana_xp_tier_entries(v_old_tier))
           else ur.sweepstakes_entries end,
         updated_at = now()
   where ur.user_id = p_user;

  return query select v_new_total, v_new_tier, v_old_tier, true;
end;
$$;
revoke all on function public.award_xp(uuid, int, text, text, text) from public, anon, authenticated;
grant execute on function public.award_xp(uuid, int, text, text, text) to service_role;

-- XP is written only through award_xp (service role). The old "Users own
-- rewards" / "Users own xp" ALL policies let a signed-in user write their
-- own total_xp and ledger directly from the browser. Reads stay.
drop policy if exists "Users own rewards" on public.user_rewards;
drop policy if exists "Users read own rewards" on public.user_rewards;
create policy "Users read own rewards" on public.user_rewards
  for select using (auth.uid() = user_id);
drop policy if exists "Users own xp" on public.xp_transactions;
drop policy if exists "Users read own xp" on public.xp_transactions;
create policy "Users read own xp" on public.xp_transactions
  for select using (auth.uid() = user_id);

-- ── 5b. ELO ───────────────────────────────────────────────────────────────
alter table public.elo_transactions add column if not exists idempotency_key text;

with ranked as (
  select id,
         case
           when category = 'learning' and metadata ? 'course_id'
             then 'learning:' || (metadata->>'course_id')
           when category = 'competition' and metadata ? 'competition_id'
             then 'competition:' || (metadata->>'competition_id')
           when category = 'activity' and reason = 'Linked real brokerage account'
             then 'activity:brokerage-linked'
           when category = 'activity' and reason = 'Email verified + onboarding completed'
             then 'activity:email-verified'
         end as k,
         user_id, created_at
    from public.elo_transactions
   where idempotency_key is null
), firsts as (
  select id, k,
         row_number() over (partition by user_id, k order by created_at, id) as rn
    from ranked where k is not null
)
update public.elo_transactions e
   set idempotency_key = f.k
  from firsts f
 where e.id = f.id and f.rn = 1;

create unique index if not exists elo_tx_idem_uq
  on public.elo_transactions (user_id, idempotency_key)
  where idempotency_key is not null;

create or replace function public.ezana_elo_tier(p_rating int)
returns text language sql immutable as $$
  select case
    when p_rating >= 8500 then 'grandmaster'
    when p_rating >= 7000 then 'master'
    when p_rating >= 5000 then 'tactician'
    when p_rating >= 2500 then 'strategist'
    when p_rating >= 1000 then 'apprentice'
    else 'novice' end;
$$;

-- One transaction: lock the rating row, apply the clamped delta, log the
-- transaction (deduped by key). A repeated key changes nothing.
create or replace function public.award_elo(
  p_user uuid,
  p_delta int,
  p_reason text,
  p_category text,
  p_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table (old_rating int, new_rating int, old_tier text, new_tier text, awarded boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old int;
  v_peak int;
  v_old_tier text;
  v_new int;
  v_inserted int;
begin
  if p_user is null or p_delta is null or p_delta = 0 then
    raise exception 'award_elo: user and nonzero delta required';
  end if;
  if exists (select 1 from profiles where id = p_user and is_disabled) then
    return query select null::int, null::int, null::text, null::text, false;
    return;
  end if;

  insert into user_elo (user_id, current_rating, peak_rating, tier)
  values (p_user, 0, 0, 'novice')
  on conflict (user_id) do nothing;

  select current_rating, peak_rating, tier into v_old, v_peak, v_old_tier
    from user_elo where user_id = p_user for update;

  v_new := least(10000, greatest(0, v_old + p_delta));

  insert into elo_transactions
    (user_id, delta, reason, category, metadata, rating_before, rating_after, idempotency_key)
  values
    (p_user, v_new - v_old, p_reason, p_category, coalesce(p_metadata, '{}'::jsonb), v_old, v_new, p_key)
  on conflict (user_id, idempotency_key) where idempotency_key is not null do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return query select v_old, v_old, v_old_tier, v_old_tier, false;
    return;
  end if;

  update user_elo
     set current_rating = v_new,
         peak_rating = greatest(v_peak, v_new),
         tier = ezana_elo_tier(v_new),
         last_activity_at = case when p_category = 'decay' then last_activity_at else now() end,
         updated_at = now()
   where user_id = p_user;

  return query select v_old, v_new, v_old_tier, ezana_elo_tier(v_new), true;
end;
$$;
revoke all on function public.award_elo(uuid, int, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.award_elo(uuid, int, text, text, text, jsonb) to service_role;

-- ── 7. Competition scoring claim ─────────────────────────────────────────
alter table public.competitions add column if not exists scoring_started_at timestamptz;
alter table public.competitions add column if not exists scoring_error text;
alter table public.competitions drop constraint if exists competitions_status_check;
alter table public.competitions add constraint competitions_status_check
  check (status = any (array['upcoming', 'active', 'ended', 'scoring', 'scored', 'score_failed', 'cancelled']));

-- Exactly one caller moves a competition into 'scoring'. A run that died
-- mid-scoring (status 'scoring' for over 30 minutes) or failed
-- ('score_failed') may be claimed again; the per-user ELO keys make the
-- re-run a no-op for anyone already awarded.
create or replace function public.claim_competition_scoring(p_id uuid)
returns setof public.competitions
language sql
security definer
set search_path = public
as $$
  update competitions
     set status = 'scoring', scoring_started_at = now(), scoring_error = null
   where id = p_id
     and (status in ('active', 'ended', 'score_failed')
          or (status = 'scoring' and scoring_started_at < now() - interval '30 minutes'))
     and ends_at <= now()
  returning *;
$$;
revoke all on function public.claim_competition_scoring(uuid) from public, anon, authenticated;
grant execute on function public.claim_competition_scoring(uuid) to service_role;

-- ── 8. Sonar ping reservation ────────────────────────────────────────────
alter table public.sonar_queries add column if not exists status text not null default 'completed';
alter table public.sonar_queries alter column datasets_searched set default '[]'::jsonb;
alter table public.sonar_queries alter column grounded set default false;
create index if not exists sonar_queries_created_idx on public.sonar_queries (created_at desc);
create index if not exists sonar_queries_ip_created_idx
  on public.sonar_queries (ip_hash, created_at desc) where ip_hash is not null;

-- Count and insert under a lock, so parallel pings cannot all pass the same
-- count. The global lock is held only for this short transaction.
create or replace function public.reserve_sonar_ping(
  p_user uuid,
  p_limit int,
  p_global_limit int,
  p_ip_hash text,
  p_ip_limit int,
  p_query text,
  p_version text,
  p_plan_tier int,
  p_is_guest boolean
)
returns table (id uuid, reason text, used int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  v_global int;
  v_used int := 0;
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('sonar:global'));
  if p_global_limit is not null then
    select count(*) into v_global from sonar_queries where created_at >= v_day;
    if v_global >= p_global_limit then
      return query select null::uuid, 'global'::text, 0;
      return;
    end if;
  end if;

  if p_user is not null then
    select count(*) into v_used from sonar_queries
     where user_id = p_user and created_at >= v_day;
    if p_limit is not null and v_used >= p_limit then
      return query select null::uuid, 'quota'::text, v_used;
      return;
    end if;
  elsif p_ip_hash is not null then
    select count(*) into v_used from sonar_queries
     where ip_hash = p_ip_hash and created_at >= v_day;
    if p_ip_limit is not null and v_used >= p_ip_limit then
      return query select null::uuid, 'quota'::text, v_used;
      return;
    end if;
  end if;

  insert into sonar_queries
    (user_id, query_text, version, plan_tier, is_guest, ip_hash, status, datasets_searched, grounded)
  values
    (p_user, coalesce(p_query, ''), p_version, coalesce(p_plan_tier, 0), coalesce(p_is_guest, false),
     p_ip_hash, 'reserved', '[]'::jsonb, false)
  returning sonar_queries.id into v_id;

  return query select v_id, null::text, v_used;
end;
$$;
revoke all on function public.reserve_sonar_ping(uuid, int, int, text, int, text, text, int, boolean)
  from public, anon, authenticated;
grant execute on function public.reserve_sonar_ping(uuid, int, int, text, int, text, text, int, boolean)
  to service_role;

-- A reservation a crashed request never completed stays 'reserved' and keeps
-- counting: the conservative side, since the model may already have run.
