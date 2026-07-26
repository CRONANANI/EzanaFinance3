-- Phase 3: judge magic-link scoring. Judges have NO account — the token in
-- pitch_judges is the sole credential, validated server-side on every request
-- through a token-gated service-role API. RLS can't apply (no auth.uid()), so the
-- score tables have NO anon/auth write policy — writes come only from that API.

-- Harden the Phase 1 token columns: store only the HASH of the raw token.
alter table public.pitch_judges
  add column if not exists token_hash text,
  add column if not exists token_issued_at timestamptz,
  add column if not exists token_revoked boolean not null default false,
  add column if not exists last_seen_at timestamptz;
create unique index if not exists idx_pj_token_hash on public.pitch_judges (token_hash)
  where token_hash is not null;

-- One score row per (judge, team, criterion).
create table if not exists public.pitch_scores (
  id           uuid primary key default gen_random_uuid(),
  judge_id     uuid not null references public.pitch_judges(id) on delete cascade,
  team_id      uuid not null references public.pitch_teams(id) on delete cascade,
  criterion_id uuid not null references public.pitch_rubric_criteria(id) on delete cascade,
  score        numeric not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (judge_id, team_id, criterion_id)
);
create index if not exists idx_ps_team on public.pitch_scores (team_id);
create index if not exists idx_ps_judge on public.pitch_scores (judge_id);

-- Overall per-judge, per-team comment + submit state.
create table if not exists public.pitch_score_summaries (
  judge_id     uuid not null references public.pitch_judges(id) on delete cascade,
  team_id      uuid not null references public.pitch_teams(id) on delete cascade,
  comment      text,
  submitted    boolean not null default false,
  submitted_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (judge_id, team_id)
);

-- RLS: host managers read (for the scoreboard); NO anon/auth write policy — the
-- token-gated service-role API is the only writer, and it bypasses RLS.
alter table public.pitch_scores enable row level security;
alter table public.pitch_score_summaries enable row level security;

drop policy if exists "host managers read scores" on public.pitch_scores;
create policy "host managers read scores" on public.pitch_scores for select using (
  team_id in (
    select t.id from public.pitch_teams t
    join public.pitch_competitions c on c.id = t.competition_id
    join public.org_members m on m.org_id = c.host_org_id
    where m.user_id = auth.uid() and m.role in ('executive', 'portfolio_manager') and m.is_active
  )
);
drop policy if exists "host managers read summaries" on public.pitch_score_summaries;
create policy "host managers read summaries" on public.pitch_score_summaries for select using (
  team_id in (
    select t.id from public.pitch_teams t
    join public.pitch_competitions c on c.id = t.competition_id
    join public.org_members m on m.org_id = c.host_org_id
    where m.user_id = auth.uid() and m.role in ('executive', 'portfolio_manager') and m.is_active
  )
);
