-- Sonar research engine v3 (Nov 2026).
-- Research runs, per-leg events, feedback, versioned engine configs,
-- benchmark evaluations, research memory, relationships, a shared TTL cache,
-- database-backed entity aliases, lobbying topic search and two lobbying RPCs.
-- Idempotent. Every table is RLS-enabled; the engine writes with the service
-- role. Members may read their own runs. No raw IPs (salted hashes only).

-- ── research runs ──────────────────────────────────────────────────────
create table if not exists public.sonar_research_runs (
  id uuid primary key,
  query_id uuid references public.sonar_queries(id) on delete set null,
  user_id uuid,
  ip_hash text,
  status text not null check (status in ('complete', 'partial', 'failed')),
  engine_version text,
  prompt_version text,
  config_version text,
  model text,
  question text,
  primary_domain text,
  domains jsonb not null default '[]'::jsonb,
  subject jsonb,
  depth text check (depth in ('quick', 'standard', 'deep')),
  plan jsonb,
  evidence_decisions jsonb,
  report jsonb,
  validation jsonb,
  deterministic boolean not null default false,
  partial boolean not null default false,
  duration_ms integer,
  phase1_ms integer,
  provider_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sonar_research_runs_created_idx on public.sonar_research_runs (created_at desc);
create index if not exists sonar_research_runs_domain_idx on public.sonar_research_runs (primary_domain, created_at desc);
create index if not exists sonar_research_runs_user_idx on public.sonar_research_runs (user_id, created_at desc) where user_id is not null;
alter table public.sonar_research_runs enable row level security;
drop policy if exists sonar_research_runs_own_read on public.sonar_research_runs;
create policy sonar_research_runs_own_read on public.sonar_research_runs
  for select to authenticated using (user_id = auth.uid());

-- ── per-leg execution events ───────────────────────────────────────────
create table if not exists public.sonar_research_events (
  id bigserial primary key,
  run_id uuid not null references public.sonar_research_runs(id) on delete cascade,
  seq integer not null,
  leg text not null,
  ok boolean not null,
  ms integer,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists sonar_research_events_run_idx on public.sonar_research_events (run_id, seq);
create index if not exists sonar_research_events_leg_idx on public.sonar_research_events (leg, created_at desc);
alter table public.sonar_research_events enable row level security;

-- ── feedback (a signal for review, never a direct change) ──────────────
create table if not exists public.sonar_research_feedback (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.sonar_research_runs(id) on delete cascade,
  kind text not null check (kind in (
    'helpful', 'incomplete', 'incorrect_finding', 'irrelevant_source',
    'outdated_evidence', 'missing_relationship', 'incorrect_calculation', 'insufficient_depth')),
  finding_id text,
  evidence_id text,
  note text check (char_length(note) <= 1000),
  user_id uuid,
  ip_hash text,
  status text not null default 'pending_review' check (status in ('pending_review', 'accepted', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  finding_key text generated always as (coalesce(finding_id, '') || ':' || coalesce(evidence_id, '')) stored,
  caller_key text generated always as (coalesce(user_id::text, ip_hash, 'anon')) stored
);
create unique index if not exists sonar_research_feedback_once
  on public.sonar_research_feedback (run_id, finding_key, kind, caller_key);
create index if not exists sonar_research_feedback_status_idx on public.sonar_research_feedback (status, created_at desc);
alter table public.sonar_research_feedback enable row level security;

-- ── versioned engine configs (retrieval weights, prompts, models) ──────
create table if not exists public.sonar_engine_configs (
  version text primary key,
  kind text not null default 'retrieval' check (kind in ('retrieval', 'prompt', 'model')),
  status text not null default 'candidate' check (status in ('candidate', 'active', 'retired', 'rejected')),
  config jsonb not null,
  parent_version text,
  changes jsonb not null default '[]'::jsonb,
  evaluation jsonb,
  created_at timestamptz not null default now(),
  promoted_at timestamptz,
  promoted_by text
);
create unique index if not exists sonar_engine_configs_one_active
  on public.sonar_engine_configs (kind) where status = 'active';
alter table public.sonar_engine_configs enable row level security;

-- Promote a candidate that passed the benchmark gate; retire the previous
-- active config of the same kind (a one-command rollback target).
create or replace function public.sonar_promote_config(p_version text, p_by text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kind text;
begin
  select kind into v_kind from sonar_engine_configs
   where version = p_version and status = 'candidate'
     and coalesce((evaluation ->> 'approved')::boolean, false);
  if v_kind is null then
    raise exception 'config % is not an approved candidate', p_version;
  end if;
  update sonar_engine_configs set status = 'retired' where kind = v_kind and status = 'active';
  update sonar_engine_configs set status = 'active', promoted_at = now(), promoted_by = p_by
   where version = p_version;
end;
$$;
revoke all on function public.sonar_promote_config(text, text) from public, anon, authenticated;

-- ── benchmark evaluations ─────────────────────────────────────────────
create table if not exists public.sonar_research_evaluations (
  id uuid primary key default gen_random_uuid(),
  suite_run text not null,
  benchmark_version text not null,
  engine text not null,
  config_version text,
  benchmark_id text not null,
  run_id uuid,
  composite numeric,
  metrics jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists sonar_research_evaluations_suite_idx on public.sonar_research_evaluations (suite_run);
create index if not exists sonar_research_evaluations_bench_idx on public.sonar_research_evaluations (benchmark_id, created_at desc);
alter table public.sonar_research_evaluations enable row level security;

-- ── research memory (per subject, scoped) ─────────────────────────────
create table if not exists public.sonar_research_memory (
  subject_key text not null,
  scope text not null,
  evidence_id text not null,
  run_id uuid references public.sonar_research_runs(id) on delete set null,
  retrieved_at timestamptz not null,
  reporting_date text,
  evidence jsonb not null,
  primary key (subject_key, scope, evidence_id)
);
create index if not exists sonar_research_memory_recent_idx
  on public.sonar_research_memory (subject_key, retrieved_at desc);
alter table public.sonar_research_memory enable row level security;

-- ── relationships (the evidence graph, across runs) ───────────────────
create table if not exists public.sonar_research_relationships (
  id bigserial primary key,
  run_id uuid not null references public.sonar_research_runs(id) on delete cascade,
  rel_key text not null,
  rel_type text not null,
  source_node text not null,
  source_label text,
  target_node text not null,
  target_label text,
  evidence_ids text[] not null default '{}',
  period jsonb,
  confidence numeric check (confidence >= 0 and confidence <= 1),
  status text not null check (status in ('observed', 'inferred')),
  note text,
  created_at timestamptz not null default now(),
  unique (run_id, rel_key)
);
create index if not exists sonar_research_rel_source_idx on public.sonar_research_relationships (source_node, rel_type);
create index if not exists sonar_research_rel_target_idx on public.sonar_research_relationships (target_node, rel_type);
alter table public.sonar_research_relationships enable row level security;

-- ── shared TTL cache ──────────────────────────────────────────────────
create table if not exists public.sonar_cache (
  key text primary key,
  value jsonb not null,
  expires_at timestamptz not null
);
create index if not exists sonar_cache_expiry_idx on public.sonar_cache (expires_at);
alter table public.sonar_cache enable row level security;

-- ── database-backed entity aliases ────────────────────────────────────
create table if not exists public.sonar_entity_aliases (
  alias_norm text not null,
  entity_type text not null check (entity_type in ('company', 'politician', 'organization', 'agency', 'institution')),
  entity_id text not null,
  label text,
  source text not null,
  confidence numeric not null default 0.8 check (confidence >= 0 and confidence <= 1),
  updated_at timestamptz not null default now(),
  primary key (alias_norm, entity_type, entity_id)
);
create index if not exists sonar_entity_aliases_lookup_idx on public.sonar_entity_aliases (entity_type, alias_norm);
alter table public.sonar_entity_aliases enable row level security;

create or replace function public.sonar_alias_key(p text)
returns text language sql immutable as $$
  select regexp_replace(replace(lower(coalesce(p, '')), '&', ' and '), '[^a-z0-9]+', '', 'g')
$$;

create or replace function public.sonar_alias_short(p text)
returns text language sql immutable as $$
  select regexp_replace(
    lower(coalesce(p, '')),
    '[,.]?\s+(inc|incorporated|corp|corporation|co|company|ltd|limited|plc|holdings?|group|sa|ag|nv|se|llc|lp|the)\.?(\s+.*)?$',
    '')
$$;

-- Rebuild aliases from the sources Ezana already maintains. Full names and
-- names without the legal suffix; short keys under 4 characters are skipped.
create or replace function public.sonar_refresh_entity_aliases()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  delete from sonar_entity_aliases where source in ('contractor_tickers', 'lobbying_client_tickers', 'industry_companies', 'congress_members');
  insert into sonar_entity_aliases (alias_norm, entity_type, entity_id, label, source, confidence)
  select distinct on (k, ticker) k, 'company', ticker, label, src, conf from (
    select sonar_alias_key(company) k, upper(ticker) ticker, company label, 'contractor_tickers' src, 0.85 conf
      from contractor_tickers where ticker is not null and coalesce(is_public, true)
    union all
    select sonar_alias_key(sonar_alias_short(company)), upper(ticker), company, 'contractor_tickers', 0.85
      from contractor_tickers where ticker is not null and coalesce(is_public, true)
    union all
    select sonar_alias_key(coalesce(company_label, client_name)), upper(ticker), coalesce(company_label, client_name), 'lobbying_client_tickers', 0.9
      from lobbying_client_tickers where ticker is not null and coalesce(verified, false)
    union all
    select sonar_alias_key(sonar_alias_short(coalesce(company_label, client_name))), upper(ticker), coalesce(company_label, client_name), 'lobbying_client_tickers', 0.9
      from lobbying_client_tickers where ticker is not null and coalesce(verified, false)
    union all
    select sonar_alias_key(company_name), upper(ticker), company_name, 'industry_companies', 0.95
      from industry_companies where ticker is not null and coalesce(is_public, true)
    union all
    select sonar_alias_key(sonar_alias_short(company_name)), upper(ticker), company_name, 'industry_companies', 0.95
      from industry_companies where ticker is not null and coalesce(is_public, true)
  ) a
  where char_length(k) >= 4
  order by k, ticker, conf desc
  on conflict (alias_norm, entity_type, entity_id) do update
    set label = excluded.label, source = excluded.source, confidence = greatest(sonar_entity_aliases.confidence, excluded.confidence), updated_at = now();
  insert into sonar_entity_aliases (alias_norm, entity_type, entity_id, label, source, confidence)
  select sonar_alias_key(full_name), 'politician', bioguide_id, full_name, 'congress_members', 0.95
    from congress_members where full_name is not null
  on conflict do nothing;
  select count(*) into n from sonar_entity_aliases;
  return n;
end;
$$;
revoke all on function public.sonar_refresh_entity_aliases() from public, anon, authenticated;

-- ── lobbying topic search ─────────────────────────────────────────────
-- The activities' free text (filled by the ingest from this release on; run
-- the backfill note in the prompt to re-walk existing filings).
-- Guarded: the lobbying tables predate the tracked migrations, so a fresh
-- schema (the SQL test harness) skips this block; production runs it.
do $lobby$
begin
if to_regclass('public.lobbying_filings') is not null
   and to_regclass('public.lobbying_client_tickers') is not null then
  alter table public.lobbying_filings add column if not exists specific_issues text;
  alter table public.lobbying_filings add column if not exists specific_tsv tsvector;
  create or replace function public.lobbying_filings_specific_tsv()
  returns trigger language plpgsql as $$
  begin
    new.specific_tsv := case when new.specific_issues is null then null
                             else to_tsvector('english', new.specific_issues) end;
    return new;
  end;
  $$;
  drop trigger if exists lobbying_filings_specific_tsv_trg on public.lobbying_filings;
  create trigger lobbying_filings_specific_tsv_trg
    before insert or update of specific_issues on public.lobbying_filings
    for each row execute function public.lobbying_filings_specific_tsv();
  create index if not exists lobbying_filings_specific_tsv_idx
    on public.lobbying_filings using gin (specific_tsv);
  create index if not exists lobbying_filings_year_amount_idx
    on public.lobbying_filings (filing_year) where amount > 0 and coalesce(is_registration, false) = false;

  -- Clients ranked by disclosed lobbying spend on matching filings. A client
  -- that files for itself (registrant = client) reports total expenses, which
  -- already include outside firms' fees, so only its own filings count;
  -- otherwise the outside firms' reported income is summed. p_text searches
  -- the specific issue descriptions (when stored); p_buckets the LDA issue
  -- buckets. Both null means every filing.
  create or replace function public.sonar_lobbying_leaders(
    p_buckets text[], p_from integer, p_to integer, p_limit integer default 20, p_text text default null)
  returns table (
    client_name text, ticker text, total_amount numeric, filings bigint,
    registrants bigint, self_filed boolean, by_year jsonb)
  language sql stable
  security definer
  set search_path = public
  as $$
    with f as (
      select lf.client_name, lf.amount, lf.filing_year, lf.registrant_id,
             sonar_alias_key(lf.client_name) ck, sonar_alias_key(lf.registrant_name) rk
        from lobbying_filings lf
       where lf.filing_year between p_from and p_to
         and coalesce(lf.is_registration, false) = false
         and lf.amount > 0
         and (p_buckets is null or lf.issue_buckets && p_buckets)
         and (p_text is null or lf.specific_tsv @@ websearch_to_tsquery('english', p_text))
    ), flag as (
      select ck, bool_or(ck = rk) self_filed from f group by ck
    ), g as (
      select f.*, flag.self_filed from f join flag using (ck)
       where (not flag.self_filed) or f.ck = f.rk
    ), yr as (
      select ck, filing_year, sum(amount) amt from g group by ck, filing_year
    ), agg as (
      select ck, max(g.client_name) client_name, bool_or(g.self_filed) self_filed,
             sum(g.amount) total_amount, count(*) filings, count(distinct g.registrant_id) registrants
        from g group by ck
    )
    select a.client_name,
           (select upper(t.ticker) from lobbying_client_tickers t
             where sonar_alias_key(t.client_name) = a.ck and coalesce(t.verified, false) limit 1),
           a.total_amount, a.filings, a.registrants, a.self_filed,
           (select jsonb_object_agg(filing_year::text, amt) from yr where yr.ck = a.ck)
      from agg a
     order by a.total_amount desc
     limit least(greatest(coalesce(p_limit, 20), 1), 100)
  $$;
  revoke all on function public.sonar_lobbying_leaders(text[], integer, integer, integer, text) from public, anon, authenticated;

  -- Lobbying by company ticker (verified client-ticker links), same counting rule.
  create or replace function public.sonar_lobbying_by_tickers(p_tickers text[], p_from integer, p_to integer)
  returns table (ticker text, total_amount numeric, filings bigint, top_issues text[])
  language sql stable
  security definer
  set search_path = public
  as $$
    with links as (
      select distinct upper(t.ticker) ticker, sonar_alias_key(t.client_name) ck
        from lobbying_client_tickers t
       where upper(t.ticker) = any (select upper(x) from unnest(p_tickers) x)
         and coalesce(t.verified, false)
    ), f as (
      select l.ticker, lf.amount, lf.issues, sonar_alias_key(lf.client_name) ck, sonar_alias_key(lf.registrant_name) rk
        from lobbying_filings lf join links l on l.ck = sonar_alias_key(lf.client_name)
       where lf.filing_year between p_from and p_to
         and coalesce(lf.is_registration, false) = false
         and lf.amount > 0
    ), flag as (select ck, bool_or(ck = rk) self_filed from f group by ck),
    g as (select f.* from f join flag using (ck) where (not flag.self_filed) or f.ck = f.rk),
    iss as (
      select g.ticker, i ->> 'display' issue, count(*) n
        from g, jsonb_array_elements(coalesce(g.issues, '[]'::jsonb)) i
       group by 1, 2
    )
    select g.ticker, sum(g.amount), count(*),
           (select array_agg(issue order by n desc) from (select issue, n from iss where iss.ticker = g.ticker order by n desc limit 6) s)
      from g group by g.ticker
     order by 2 desc
  $$;
  revoke all on function public.sonar_lobbying_by_tickers(text[], integer, integer) from public, anon, authenticated;
end if;
end;
$lobby$;

-- ── retention ─────────────────────────────────────────────────────────
-- Guest runs and their events after 180 days, member runs after 400,
-- reviewed feedback after 400, expired cache rows, memory after 365.
create or replace function public.sonar_research_retention()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from sonar_research_runs where user_id is null and created_at < now() - interval '180 days';
  delete from sonar_research_runs where user_id is not null and created_at < now() - interval '400 days';
  delete from sonar_research_feedback where status <> 'pending_review' and created_at < now() - interval '400 days';
  delete from sonar_cache where expires_at < now();
  delete from sonar_research_memory where retrieved_at < now() - interval '365 days';
end;
$$;
revoke all on function public.sonar_research_retention() from public, anon, authenticated;
