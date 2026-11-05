-- Award facts for the largest federal awards of listed companies (Nov 4, 2026).
-- Filled hourly by /api/cron/enrich-contract-awards from the USAspending
-- award API, for the awards in company_contract_top_awards. Read by Sonar's
-- government-exposure report (landing-pipeline topAwardsFor) to separate
-- what was obligated from the ceiling (base and all options) and from what
-- has been exercised, with the PIID, purpose and modification dates.
--
-- NOT executed by the implementer. Noah applies it by hand in the SQL Editor.
-- Additive and idempotent.

create table if not exists public.company_contract_award_facts (
  generated_award_id      text primary key,
  piid                    text,
  description             text,
  award_type              text,
  awarding_agency         text,
  awarding_sub_agency     text,
  recipient_name          text,
  parent_recipient_name   text,
  total_obligation        numeric,   -- obligated to date
  base_exercised_options  numeric,   -- current value: base plus exercised options
  base_and_all_options    numeric,   -- ceiling: base plus every option
  date_signed             date,
  last_modified_date      date,
  modification_count      integer,   -- one page of up to 100 actions: 100 means 100 or more
  pop_start               date,
  pop_end                 date,
  pop_potential_end       date,
  parent_award_piid       text,
  synced_at               timestamptz not null default now()
);

create index if not exists company_contract_award_facts_synced_idx
  on public.company_contract_award_facts (synced_at);

-- Server reads only (service role).
alter table public.company_contract_award_facts enable row level security;
revoke all on public.company_contract_award_facts from anon, authenticated;
