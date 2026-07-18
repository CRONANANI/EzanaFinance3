-- Government Contracts rollup tables. BigQuery
-- (ezana-data.usaspending.contract_awards, millions of rows) is the source of
-- truth; the sync-bq-rollups cron aggregates it into these small, public-read
-- tables so the page renders fast without scanning raw awards. Additive.
-- agency_bucket is the server-normalized canonical bucket (gov-agency-taxonomy);
-- the raw awarding_agency is kept for drill-down.

create table if not exists public.gov_contract_recipient_rollup (
  fiscal_year     int not null,
  recipient_name  text not null,
  awarding_agency text not null,        -- raw agency name (drill-down)
  agency_bucket   text,                 -- canonical taxonomy bucket
  total_amount    numeric not null default 0,
  award_count     bigint not null default 0,
  synced_at       timestamptz not null default now(),
  primary key (fiscal_year, recipient_name, awarding_agency)
);
create index if not exists idx_gcrr_fy on public.gov_contract_recipient_rollup (fiscal_year);
create index if not exists idx_gcrr_total on public.gov_contract_recipient_rollup (total_amount desc);
create index if not exists idx_gcrr_bucket on public.gov_contract_recipient_rollup (fiscal_year, agency_bucket);

create table if not exists public.gov_contract_agency_rollup (
  fiscal_year     int not null,
  awarding_agency text not null,
  agency_bucket   text,
  total_amount    numeric not null default 0,
  award_count     bigint not null default 0,
  synced_at       timestamptz not null default now(),
  primary key (fiscal_year, awarding_agency)
);
create index if not exists idx_gcar_fy on public.gov_contract_agency_rollup (fiscal_year);

create table if not exists public.gov_contract_coverage (
  fiscal_year   int primary key,
  award_count   bigint not null default 0,
  total_amount  numeric not null default 0,
  synced_at     timestamptz not null default now()
);

-- Public-read (marketing dataset); writes locked to the service role.
do $$
declare t text;
begin
  foreach t in array array[
    'gov_contract_recipient_rollup',
    'gov_contract_agency_rollup',
    'gov_contract_coverage'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read %1$s" on public.%1$I', t);
    execute format('create policy "public read %1$s" on public.%1$I for select using (true)', t);
    execute format('revoke insert, update, delete on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
end $$;
