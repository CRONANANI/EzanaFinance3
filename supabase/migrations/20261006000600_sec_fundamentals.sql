-- Company fundamentals (SEC XBRL frames). Applied by Claude Code via the
-- Supabase MCP (apply_migration) at Noah's request, Titans Shadow steps 2 to 4.
create table if not exists public.sec_fundamentals (
  cik text not null,
  concept text not null check (concept ~ '^[a-z_]{2,40}$'),
  frame text not null,                    -- 'CY2025' (annual), 'CY2026Q2' (quarter), 'CY2026Q2I' (instant)
  ticker text,
  entity_name text,
  period_type text not null check (period_type in ('annual', 'quarter', 'instant')),
  period_end date,
  value numeric not null,
  unit text not null,
  taxonomy_concept text not null,
  accession_no text,
  synced_at timestamptz not null default now(),
  primary key (cik, concept, frame)
);

create index if not exists sec_fundamentals_ticker_idx
  on public.sec_fundamentals (ticker, concept, period_end desc);
create index if not exists sec_fundamentals_frame_concept_idx
  on public.sec_fundamentals (frame, concept);

alter table public.sec_fundamentals enable row level security;
drop policy if exists "sec_fundamentals_public_read" on public.sec_fundamentals;
create policy "sec_fundamentals_public_read"
  on public.sec_fundamentals for select to anon, authenticated using (true);
revoke insert, update, delete on public.sec_fundamentals from anon, authenticated;
grant select on public.sec_fundamentals to anon, authenticated;
