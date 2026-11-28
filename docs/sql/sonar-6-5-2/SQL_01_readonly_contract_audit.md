# Sonar 6.5.2 SQL 01: read-only contract-data audit

Read-only. Project `jhdzpadfzrhiekcfgtai`. Not executed by Claude (no read-only database access
was authorized for this task). Run in the Supabase SQL editor and keep the output with the
approval record.

## 1. Agency values as stored (awarding and funding), with nulls

```sql
select 'awarding' as basis, awarding_agency as agency, count(*) as awards, sum(award_amount) as usd
from public.usaspending_contract_awards group by 2
union all
select 'funding', funding_agency, count(*), sum(award_amount)
from public.usaspending_contract_awards group by 2
order by basis, awards desc;
```

Expected for exact matching: every non-null value is one of the 11 canonical toptier names in
`src/lib/contractors/agencies.js`, or a toptier agency outside those 11. Any spelling variant
of a supported agency belongs in `SOURCE_ALIASES` after review; until then those rows are
"unresolved" (neither counted nor treated as another agency).

## 2. Coverage of the 11 supported agencies

```sql
with canon(name) as (values
  ('Department of Defense'), ('Department of Energy'), ('Department of Homeland Security'),
  ('National Aeronautics and Space Administration'), ('Department of Health and Human Services'),
  ('Department of Veterans Affairs'), ('General Services Administration'), ('Department of Justice'),
  ('Department of State'), ('Department of the Treasury'), ('Department of Transportation'))
select
  count(*)                                                        as awards,
  count(*) filter (where awarding_agency in (select name from canon)) as awarding_supported,
  count(*) filter (where awarding_agency is null)                 as awarding_missing,
  count(*) filter (where funding_agency is null)                  as funding_missing,
  count(*) filter (where awarding_agency is distinct from funding_agency) as basis_differs
from public.usaspending_contract_awards;
```

## 3. What the date and amount columns hold

```sql
-- action_date is the search field "Start Date": compare with the award API's dates
select a.generated_award_id, a.action_date as stored_start, f.pop_start, f.date_signed,
       a.award_amount as stored_award_amount, f.total_obligation, f.base_exercised_options,
       f.base_and_all_options, f.modification_count, f.last_modified_date
from public.usaspending_contract_awards a
join public.company_contract_award_facts f using (generated_award_id)
order by a.award_amount desc
limit 25;

-- how often the stored amount equals obligated-to-date vs the ceiling
select count(*) as joined,
       count(*) filter (where a.award_amount = f.total_obligation)      as equals_obligated,
       count(*) filter (where a.award_amount = f.base_and_all_options)  as equals_ceiling
from public.usaspending_contract_awards a
join public.company_contract_award_facts f using (generated_award_id);
```

## 4. Awards modified after they started (where cohort and flow diverge)

```sql
select count(*)                                                    as awards_with_facts,
       count(*) filter (where f.modification_count > 1)            as modified,
       count(*) filter (where f.last_modified_date > f.date_signed + 365) as modified_a_year_later,
       count(*) filter (where f.modification_count >= 100)         as hundred_plus_actions
from public.company_contract_award_facts f;
```

## 5. Future start dates and future performance ends

```sql
select count(*) filter (where action_date > current_date) as starts_after_today
from public.usaspending_contract_awards;

select count(*) filter (where pop_end > current_date)      as performance_ends_after_today
from public.company_contract_award_facts;
```

## 6. Volume inputs for the transaction table estimate

```sql
select count(*)                       as top_awards,
       sum(least(coalesce(modification_count, 1), 100)) as actions_lower_bound,
       avg(coalesce(modification_count, 1))             as avg_actions_per_award
from public.company_contract_award_facts;

select count(*) as resolved_awards, count(distinct ticker) as tickers
from public.contract_awards_resolved where ticker is not null;
```

`modification_count` stops at 100 (one page), so the sum is a lower bound.
