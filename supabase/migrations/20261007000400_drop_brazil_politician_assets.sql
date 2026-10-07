-- 20261007000400_drop_brazil_politician_assets.sql
-- Brazil is removed from the politician tracker. Drops everything
-- 20261007000300_brazil_politician_assets.sql created. Safe to re-run.

drop function if exists public.br_refresh_totals(integer);
drop view if exists public.br_candidates_v;
drop table if exists public.br_candidate_assets;
drop table if exists public.br_candidates;
