-- Query support for the scaled Government Contracts page (full FY2012-FY2026
-- table instead of a ~100-row slice): indexes for the new filter/sort patterns
-- (agency, recipient, fiscal year, and the default fiscal-year + amount sort),
-- plus a grouped-count RPC for the coverage window and the FY filter list.
-- The table already indexes award_amount DESC and action_date (host migration).

create index if not exists idx_usa_recipient
  on public.usaspending_contract_awards (recipient_name);
create index if not exists idx_usa_agency
  on public.usaspending_contract_awards (awarding_agency);
create index if not exists idx_usa_fiscal_year
  on public.usaspending_contract_awards (fiscal_year);
-- Composite for the default view: newest fiscal year first, largest award first.
create index if not exists idx_usa_fy_amount
  on public.usaspending_contract_awards (fiscal_year, award_amount desc);

-- Awards per fiscal year — powers the coverage window ("FY2012-FY2026"), the
-- total-count display, and the 15-year filter list without pulling rows.
create or replace function public.usaspending_fy_counts()
returns table (fiscal_year int, awards bigint)
language sql
stable
as $$
  select fiscal_year, count(*)::bigint as awards
  from public.usaspending_contract_awards
  where fiscal_year is not null
  group by fiscal_year
  order by fiscal_year;
$$;

grant execute on function public.usaspending_fy_counts() to anon, authenticated, service_role;
