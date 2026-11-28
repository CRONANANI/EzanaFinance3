# Sonar 6.5.2 SQL 02 (proposal): transaction-level contract obligations

**Not applied. Requires approval.** Additive. Creates the two tables the fiscal-year obligation
measures read (`src/lib/sonar/composer/analytics-server.js`, source `contracts_flow`) and the
disabled ingestion writes (`src/lib/contractors/transactions.js`,
`src/app/api/cron/ingest-contract-transactions`). Until it is applied, those measures report
"unavailable". After it is applied and before any ingestion, every company is "unknown"
(no award has a complete sync row): nothing is shown as zero.

```sql
create table if not exists public.usaspending_contract_transactions (
  source_transaction_id      text primary key,          -- USAspending transaction `id`
  generated_award_id         text not null,             -- the award (usaspending_contract_awards key)
  action_date                date not null,             -- the action's date (not the award start)
  federal_action_obligation  numeric not null,          -- signed obligation change; negative = deobligation
  federal_fiscal_year        integer not null,          -- October 1 starts the next FY
  modification_number        text,
  action_type                text,
  source_provider            text not null default 'USAspending',
  source_endpoint            text not null default '/api/v2/transactions/',
  synced_at                  timestamptz not null default now(),
  constraint usaspending_tx_fy_matches_date check (
    federal_fiscal_year = extract(year from action_date)::int
                          + case when extract(month from action_date) >= 10 then 1 else 0 end)
);

create index if not exists usaspending_tx_award_date
  on public.usaspending_contract_transactions (generated_award_id, action_date);
create index if not exists usaspending_tx_fy
  on public.usaspending_contract_transactions (federal_fiscal_year);

-- Per-award completeness: what lets a reader tell "no actions in the year" (complete) from
-- "not ingested" (unknown).
create table if not exists public.usaspending_award_transaction_sync (
  generated_award_id  text primary key,
  synced_at           timestamptz not null default now(),
  transaction_count   integer not null default 0,
  rejected_count      integer not null default 0,
  conflict_count      integer not null default 0,
  complete            boolean not null default false,
  detail              text
);
create index if not exists usaspending_award_tx_sync_complete
  on public.usaspending_award_transaction_sync (complete, synced_at);

-- Server only (service role reads and writes), like company_contract_award_facts.
alter table public.usaspending_contract_transactions enable row level security;
alter table public.usaspending_award_transaction_sync enable row level security;
revoke all on public.usaspending_contract_transactions from anon, authenticated;
revoke all on public.usaspending_award_transaction_sync from anon, authenticated;
```

## Verification (after applying, before ingestion)

```sql
select count(*) from public.usaspending_contract_transactions;      -- 0
select count(*) from public.usaspending_award_transaction_sync;     -- 0
select relrowsecurity from pg_class where relname in
  ('usaspending_contract_transactions', 'usaspending_award_transaction_sync');  -- both true
```

## Verification (after a bounded ingestion run)

```sql
-- every stored action belongs to a synced award; FY matches the date (enforced)
select count(*) as orphan_actions
from public.usaspending_contract_transactions t
left join public.usaspending_award_transaction_sync s using (generated_award_id)
where s.generated_award_id is null;                                  -- expected 0

-- per complete award, the sum of actions vs the award API's obligated-to-date
select s.generated_award_id, sum(t.federal_action_obligation) as sum_actions, f.total_obligation,
       sum(t.federal_action_obligation) - f.total_obligation as difference
from public.usaspending_award_transaction_sync s
join public.usaspending_contract_transactions t using (generated_award_id)
join public.company_contract_award_facts f using (generated_award_id)
where s.complete
group by s.generated_award_id, f.total_obligation
order by abs(sum(t.federal_action_obligation) - f.total_obligation) desc
limit 25;                                                            -- expected near 0
```

A large difference stops the rollout (see the runbook): it means actions are missing or the
amount field is not what the design assumes.

## Rollback

```sql
drop table if exists public.usaspending_contract_transactions;
drop table if exists public.usaspending_award_transaction_sync;
```
