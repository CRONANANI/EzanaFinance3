-- Ezana API v1: keys, usage metering, request review.

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  key_prefix text not null unique check (key_prefix ~ '^ezk_(live|test)_[A-Za-z0-9]{8}$'),
  key_hash text not null,
  name text not null check (char_length(name) between 1 and 80),
  owner_user_id uuid references auth.users (id) on delete set null,
  owner_email text not null check (char_length(owner_email) between 3 and 200),
  company text check (company is null or char_length(company) <= 160),
  request_id uuid references public.api_access_requests (id) on delete set null,
  tier text not null check (tier in ('developer', 'trader', 'quant_firm', 'institution')),
  scopes text[] not null default '{}',
  rate_limit_per_min integer not null check (rate_limit_per_min between 1 and 100000),
  delay_days integer not null default 0 check (delay_days between 0 and 365),
  status text not null default 'pending_claim' check (status in ('pending_claim', 'active', 'revoked')),
  claim_token_hash text unique,
  claim_expires_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  last_used_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz
);

create index if not exists api_keys_owner_idx on public.api_keys (owner_user_id);
create index if not exists api_keys_status_idx on public.api_keys (status);

create table if not exists public.api_usage_daily (
  key_id uuid not null references public.api_keys (id) on delete cascade,
  day date not null,
  endpoint text not null check (char_length(endpoint) <= 120),
  requests bigint not null default 0,
  rows_returned bigint not null default 0,
  errors bigint not null default 0,
  primary key (key_id, day, endpoint)
);

-- Short request log for abuse review; pruned to 30 days by the cron below.
create table if not exists public.api_request_log (
  id bigint generated always as identity primary key,
  key_id uuid references public.api_keys (id) on delete cascade,
  at timestamptz not null default now(),
  method text not null,
  endpoint text not null,
  status integer not null,
  duration_ms integer,
  ip_hash text,
  request_id text
);
create index if not exists api_request_log_key_at_idx on public.api_request_log (key_id, at desc);
create index if not exists api_request_log_at_idx on public.api_request_log (at);

alter table public.api_access_requests
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by text,
  add column if not exists review_note text,
  add column if not exists api_key_id uuid references public.api_keys (id) on delete set null;

-- Keys are owner-readable (Settings tab lists them); everything else is service role only.
alter table public.api_keys enable row level security;
alter table public.api_usage_daily enable row level security;
alter table public.api_request_log enable row level security;

drop policy if exists "api_keys_owner_read" on public.api_keys;
create policy "api_keys_owner_read" on public.api_keys
  for select to authenticated using ((select auth.uid()) = owner_user_id);

drop policy if exists "api_usage_owner_read" on public.api_usage_daily;
create policy "api_usage_owner_read" on public.api_usage_daily
  for select to authenticated
  using (exists (select 1 from public.api_keys k where k.id = key_id and k.owner_user_id = (select auth.uid())));

revoke all on public.api_keys, public.api_usage_daily, public.api_request_log from anon;
revoke insert, update, delete on public.api_keys, public.api_usage_daily, public.api_request_log from authenticated;
revoke select on public.api_request_log from authenticated;
grant select on public.api_keys, public.api_usage_daily to authenticated;

-- One round trip per request to meter usage.
create or replace function public.api_usage_increment(
  p_key_id uuid,
  p_endpoint text,
  p_rows integer,
  p_error boolean
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.api_usage_daily (key_id, day, endpoint, requests, rows_returned, errors)
  values (p_key_id, (now() at time zone 'utc')::date, left(p_endpoint, 120), 1,
          greatest(coalesce(p_rows, 0), 0), case when p_error then 1 else 0 end)
  on conflict (key_id, day, endpoint) do update
    set requests = api_usage_daily.requests + 1,
        rows_returned = api_usage_daily.rows_returned + excluded.rows_returned,
        errors = api_usage_daily.errors + excluded.errors;
  update public.api_keys set last_used_at = now()
   where id = p_key_id and (last_used_at is null or last_used_at < now() - interval '1 minute');
$$;

revoke all on function public.api_usage_increment(uuid, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.api_usage_increment(uuid, text, integer, boolean) to service_role;
