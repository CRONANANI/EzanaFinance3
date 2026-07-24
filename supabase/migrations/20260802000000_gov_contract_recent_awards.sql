-- Most-recent contract awards, surfaced in the ticker on the Government
-- Contracts page. BigQuery (ezana-data.usaspending.contract_awards) is the
-- source of truth; sync-bq-rollups refreshes this small table so the page can
-- read "newest awards" without scanning 49M rows.
--
-- Deliberately capped (~200 rows). This is a display feed, not an archive.

create table if not exists public.gov_contract_recent_awards (
  generated_award_id  text primary key,
  award_id_piid       text,
  recipient_name      text not null,
  recipient_parent_name text,
  awarding_agency     text not null,
  awarding_sub_agency text,
  funding_agency      text,
  award_amount        numeric not null default 0,
  action_date         date not null,
  fiscal_year         int not null,
  naics_code          text,
  naics_description   text,
  psc_code            text,
  psc_description     text,
  pop_state           text,
  pop_city            text,
  description         text,
  -- Cached, on-demand AI analysis of the award (Task 7). Null until first opened;
  -- re-generated only on a cache miss, so a repeatedly-opened award costs one call.
  analysis            text,
  analysis_generated_at timestamptz,
  synced_at           timestamptz not null default now()
);

create index if not exists idx_gcra_action_date
  on public.gov_contract_recent_awards (action_date desc);

-- Public read, service-role writes — same RLS style as gov_contract_rollups.
do $$
begin
  execute 'alter table public.gov_contract_recent_awards enable row level security';
  execute 'drop policy if exists "public read gov_contract_recent_awards" on public.gov_contract_recent_awards';
  execute 'create policy "public read gov_contract_recent_awards" on public.gov_contract_recent_awards for select using (true)';
end $$;
