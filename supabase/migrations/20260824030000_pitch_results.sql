-- Phase 4: materialized competition results. Derived from pitch_scores +
-- pitch_score_summaries + pitch_rubric_criteria, materialized so a reveal is
-- instant and stable. Judge disagreement is kept honest via judge_count (a team
-- scored by 2 of 3 judges reads as such, not silently averaged as complete).

create table if not exists public.pitch_results (
  competition_id uuid not null references public.pitch_competitions(id) on delete cascade,
  team_id        uuid not null references public.pitch_teams(id) on delete cascade,
  rank           int,
  weighted_total numeric,            -- normalized 0..100, same scale as the scoreboard
  judge_count    int,                -- judges who SUBMITTED for this team
  computed_at    timestamptz not null default now(),
  primary key (competition_id, team_id)
);

alter table public.pitch_results enable row level security;

-- Host managers read always; a participating org reads its own teams ONLY after
-- the host flips results_visible. Competitors never see results early.
drop policy if exists "results read gated by reveal" on public.pitch_results;
create policy "results read gated by reveal" on public.pitch_results for select using (
  team_id in (
    select t.id from public.pitch_teams t
    join public.pitch_competitions c on c.id = t.competition_id
    join public.org_members m on m.org_id = c.host_org_id
    where m.user_id = auth.uid() and m.role in ('executive', 'portfolio_manager') and m.is_active
  )
  or team_id in (
    select t.id from public.pitch_teams t
    join public.pitch_competitions c on c.id = t.competition_id
    join public.org_members m on m.org_id = t.org_id
    where m.user_id = auth.uid() and m.is_active and c.results_visible = true
  )
);

-- Let a judge opt to attribute their written feedback by name (default: anonymized
-- to "Judge from [Firm]"). Bankers give franker feedback when not personally named.
alter table public.pitch_score_summaries
  add column if not exists attribute_comment boolean not null default false;
