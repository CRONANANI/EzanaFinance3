-- Executive compensation (pay versus performance). Applied by Claude Code via
-- the Supabase MCP (apply_migration) at Noah's request, Titans Shadow steps 2 to 4.
create table if not exists public.sec_exec_comp (
  cik text not null,
  fiscal_year integer not null check (fiscal_year between 2000 and 2100),
  peo_key text not null default '',       -- PEO name when the filing distinguishes several, else ''
  ticker text,
  entity_name text,
  peo_name text,
  peo_total_comp numeric,                 -- summary compensation table total
  peo_comp_actually_paid numeric,
  non_peo_neo_avg_total_comp numeric,
  non_peo_neo_avg_comp_actually_paid numeric,
  company_tsr numeric,                    -- value of a $100 investment, as tagged
  peer_group_tsr numeric,
  net_income numeric,
  company_selected_measure_name text,
  company_selected_measure_value numeric,
  accession_no text,
  filed_at date,
  synced_at timestamptz not null default now(),
  primary key (cik, fiscal_year, peo_key)
);

create index if not exists sec_exec_comp_ticker_idx
  on public.sec_exec_comp (ticker, fiscal_year desc);

alter table public.sec_exec_comp enable row level security;
drop policy if exists "sec_exec_comp_public_read" on public.sec_exec_comp;
create policy "sec_exec_comp_public_read"
  on public.sec_exec_comp for select to anon, authenticated using (true);
revoke insert, update, delete on public.sec_exec_comp from anon, authenticated;
grant select on public.sec_exec_comp to anon, authenticated;
