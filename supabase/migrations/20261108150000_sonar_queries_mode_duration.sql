-- Sonar ledger: which research mode actually ran and how long it took (Nov 2026).
-- Production already has both columns (added by hand); this file makes the repo match and is
-- safe to re-run. The index serves /api/sonar/estimate's 7-day p50/p90 per mode.
do $$
begin
  if to_regclass('public.sonar_queries') is not null then
    alter table public.sonar_queries add column if not exists mode text;
    alter table public.sonar_queries add column if not exists duration_ms integer;
    create index if not exists sonar_queries_mode_created_idx
      on public.sonar_queries (mode, created_at desc)
      where duration_ms is not null;
  end if;
end
$$;
