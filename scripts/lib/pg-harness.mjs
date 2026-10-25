/**
 * A throwaway local Postgres for the reliability SQL checks: initdb into a
 * temp dir, start on a free port with a unix socket, load a stub of the
 * tables the migrations touch, apply the migrations, run SQL through psql.
 * `startPg()` resolves to null when no Postgres binaries are installed, so
 * the check skips (CI) instead of failing.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, chmodSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

function findBin() {
  const root = '/usr/lib/postgresql';
  if (existsSync(root)) {
    const versions = readdirSync(root).sort().reverse();
    for (const v of versions) {
      const bin = path.join(root, v, 'bin');
      if (existsSync(path.join(bin, 'initdb'))) return bin;
    }
  }
  try {
    const p = execFileSync('sh', ['-c', 'command -v initdb'], { encoding: 'utf8' }).trim();
    return p ? path.dirname(p) : null;
  } catch {
    return null;
  }
}

const asRoot = process.getuid?.() === 0;

function run(bin, args, opts = {}) {
  if (asRoot) {
    const cmd = [bin, ...args].map((a) => `'${String(a).replace(/'/g, `'\\''`)}'`).join(' ');
    return execFileSync('su', ['postgres', '-s', '/bin/sh', '-c', cmd], {
      encoding: 'utf8',
      ...opts,
    });
  }
  return execFileSync(bin, args, { encoding: 'utf8', ...opts });
}

export const STUB_SCHEMA = `
do $$ begin
  create role anon; exception when duplicate_object then null; end $$;
do $$ begin
  create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin
  create role service_role; exception when duplicate_object then null; end $$;
create extension if not exists pgcrypto;
create schema if not exists auth;
create table auth.users (id uuid primary key default gen_random_uuid());
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
create or replace function auth.role() returns text language sql stable as $$
  select auth.jwt() ->> 'role' $$;
alter role service_role bypassrls;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

create table public.profiles (
  id uuid primary key, email text, full_name text, created_at timestamptz default now(),
  updated_at timestamptz default now(), legacy_user boolean default false, legacy_number int,
  plan text default 'free', onboarded boolean default false, preferences jsonb default '{}',
  onboarding_completed boolean, stripe_customer_id text, subscription_status text default 'inactive',
  subscription_plan text, subscription_id text, current_period_end timestamptz, one_time_plan text,
  one_time_plan_purchased_at timestamptz, email_verified boolean default false,
  pinned_cards jsonb default '{}', checklist_progress jsonb default '{}',
  checklist_completed boolean default false, has_seen_tutorial boolean default false,
  user_settings jsonb default '{}', privacy_show_portfolio boolean default true,
  privacy_show_trades boolean default true, privacy_show_holdings boolean default false,
  privacy_show_activity boolean default true, privacy_show_watchlist boolean default false,
  privacy_show_on_leaderboard boolean default true, is_partner boolean default false,
  partner_type text, partner_verified_at timestamptz, phone text, date_of_birth date, country text,
  state text, city text, display_name text, bio text, investor_type text default 'retail',
  experience_level text default 'intermediate', website text, twitter text, linkedin text,
  onboarding_step int default 0, username text, avatar_url text, deleted_at timestamptz,
  deletion_scheduled_for timestamptz, reactivation_token text, is_disabled boolean not null default false,
  disabled_reason text, disabled_at timestamptz, investor_questionnaire jsonb default '{}',
  investor_questionnaire_completed boolean default false, investor_profile jsonb, current_plan text,
  subscription_period_end timestamptz, tours_seen jsonb not null default '{}', beginner_tips_pref text default 'auto',
  beginner_seen jsonb default '[]', analyses_run int default 0, lessons_completed_count int default 0,
  is_demo boolean not null default false, risk_score int, risk_category text,
  partner_questionnaire jsonb default '{}', creator_tier text, subscription_source text,
  community_terms_accepted_at timestamptz
);
alter table public.profiles enable row level security;
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can update own pinned cards" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create table public.partners (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, status text,
  commission_rate numeric, total_earnings numeric, payout_email text,
  echo_writer_approved boolean default false, username text, display_name text, avatar_url text
);
alter table public.partners enable row level security;
create policy "Users see own partner record" on public.partners for all using (auth.uid() = user_id);
create table public.alpaca_accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, alpaca_account_id text not null,
  account_status text, first_name text, last_name text, created_at timestamptz, updated_at timestamptz
);
alter table public.alpaca_accounts enable row level security;
create policy "Users see own alpaca account" on public.alpaca_accounts for all using (auth.uid() = user_id);
create table public.trade_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alpaca_order_id text, symbol text not null, side text not null, qty text, notional text,
  order_type text, status text, created_at timestamptz default now()
);
alter table public.trade_history enable row level security;
create policy "Users own trades" on public.trade_history for all using (auth.uid() = user_id);
create table public.brokerage_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  alpaca_account_id text not null, alpaca_account_number text, account_status text default 'SUBMITTED',
  kyc_status text, created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.brokerage_accounts enable row level security;
create policy "Users own brokerage" on public.brokerage_accounts for all using (auth.uid() = user_id);
create table public.mock_trades (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, ticker text not null,
  quantity numeric not null, price numeric not null, trade_type text not null,
  total_amount numeric, created_at timestamptz not null default now()
);
create table public.xp_transactions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, amount int not null,
  reason text not null, category text not null, created_at timestamptz default now()
);
alter table public.xp_transactions enable row level security;
create policy "Users own xp" on public.xp_transactions for all using (auth.uid() = user_id);
create table public.user_rewards (
  id uuid primary key default gen_random_uuid(), user_id uuid not null unique,
  total_xp int default 0, trading_credit_balance numeric default 0,
  sweepstakes_entries int default 0, tier text default 'bronze',
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table public.user_rewards enable row level security;
create policy "Users own rewards" on public.user_rewards for all using (auth.uid() = user_id);
create table public.user_elo (
  user_id uuid primary key,
  current_rating int not null default 0 check (current_rating between 0 and 10000),
  peak_rating int not null default 0 check (peak_rating between 0 and 10000),
  tier text not null default 'novice', last_activity_at timestamptz,
  last_decay_check timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.elo_transactions (
  id bigserial primary key, user_id uuid not null, delta int not null, reason text not null,
  category text not null check (category in ('learning','activity','portfolio','social','competition','decay','admin')),
  metadata jsonb default '{}'::jsonb, rating_before int not null, rating_after int not null,
  created_at timestamptz not null default now()
);
create table public.competitions (
  id uuid primary key default gen_random_uuid(), name text not null,
  starts_at timestamptz not null, ends_at timestamptz not null,
  status text not null default 'upcoming'
    constraint competitions_status_check check (status in ('upcoming','active','ended','scored','cancelled')),
  scored_at timestamptz
);
create table public.sec_13f_holdings (
  id bigserial primary key, accession_no text not null, name_of_issuer text, cusip text,
  ticker text, value_usd numeric not null default 0, shares numeric, share_type text,
  put_call text, synced_at timestamptz not null default now()
);
create table public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null,
  sender_id uuid, content text, created_at timestamptz not null default now(), read_at timestamptz
);
create table public.org_assignment_submissions (
  id uuid primary key default gen_random_uuid(), assignment_id uuid not null, org_id uuid not null,
  submitted_by uuid not null, version int not null default 1, note text,
  created_at timestamptz default now()
);
create table public.rate_limit_buckets (
  bucket_key text primary key, count int not null default 0,
  window_start timestamptz not null default now(), expires_at timestamptz not null,
  last_hit_at timestamptz not null default now()
);
create table public.plaid_items (
  id uuid primary key default gen_random_uuid(), user_id uuid, item_id text,
  access_token text, institution_id text, institution_name text, institution_logo text,
  status text, error_code text, consent_expiration timestamptz, created_at timestamptz,
  updated_at timestamptz
);
alter table public.plaid_items enable row level security;
create policy "Users see own plaid_items" on public.plaid_items for all using (auth.uid() = user_id);
create table public.sonar_queries (
  id uuid primary key default gen_random_uuid(), user_id uuid, query_text text not null,
  classification text, version text, plan_tier int, datasets_searched jsonb not null,
  grounded boolean not null, created_at timestamptz not null default now(),
  is_guest boolean not null default false, ip_hash text
);
`;

export async function startPg({ migrations = [], extraSchema = '' } = {}) {
  const bin = findBin();
  if (!bin) return null;
  const dir = mkdtempSync(path.join(tmpdir(), 'ezpg-'));
  chmodSync(dir, 0o777);
  const data = path.join(dir, 'data');
  const port = 20000 + Math.floor(Math.random() * 20000);
  run(path.join(bin, 'initdb'), ['-D', data, '-U', 'postgres', '-A', 'trust'], { stdio: 'pipe' });
  run(
    path.join(bin, 'pg_ctl'),
    [
      '-D',
      data,
      '-o',
      `-p ${port} -k ${dir} -c listen_addresses=''`,
      '-l',
      path.join(dir, 'log'),
      '-w',
      'start',
    ],
    { stdio: 'pipe' },
  );

  const psqlBin = path.join(bin, 'psql');
  const base = [
    '-h',
    dir,
    '-p',
    String(port),
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-q',
    '-t',
    '-A',
  ];

  const sql = (text) =>
    execFileSync(psqlBin, [...base, '-c', text], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  const file = (f) =>
    execFileSync(psqlBin, [...base, '-f', f], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

  /* Run the same statement from n separate connections at once. */
  const parallel = (texts) =>
    Promise.all(
      texts.map(
        (text) =>
          new Promise((resolve) => {
            const p = spawn(psqlBin, [...base, '-c', text]);
            let out = '';
            let err = '';
            p.stdout.on('data', (d) => (out += d));
            p.stderr.on('data', (d) => (err += d));
            p.on('close', (code) => resolve({ code, out: out.trim(), err: err.trim() }));
          }),
      ),
    );

  sql(STUB_SCHEMA);
  /* Tables the QA remediation migrations touch (buckets, mock portfolio,
     learning, community posts). Idempotent. */
  sql((await import('./retail-qa-stub.mjs')).RETAIL_STUB);
  if (extraSchema) sql(extraSchema);
  for (const m of migrations) file(m);

  const stop = () => {
    try {
      run(path.join(bin, 'pg_ctl'), ['-D', data, '-m', 'immediate', 'stop'], { stdio: 'pipe' });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
  return { sql, file, parallel, stop, readLog: () => readFileSync(path.join(dir, 'log'), 'utf8') };
}
