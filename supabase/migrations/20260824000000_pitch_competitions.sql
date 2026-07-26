-- Stock-pitch competitions: STANDALONE entities that university orgs enter as
-- teams and external bankers judge. NOT owned by any single org's normal tables —
-- the competition is neutral ground that multiple orgs join (like a tournament
-- bracket several clubs enter). Phase 1 = the host's control panel + data model;
-- team registration (Phase 2) and the judge magic-link experience (Phase 3) build
-- on this schema, which is why it's provisioned in full here.

-- ── The competition itself ──
create table if not exists public.pitch_competitions (
  id            uuid primary key default gen_random_uuid(),
  host_org_id   uuid not null references public.organizations(id) on delete cascade,
  name          text not null,
  slug          text not null unique,
  description   text,
  format        text not null default 'showcase'
                  check (format in ('showcase', 'single_elim', 'round_robin')),
  theme         text,                                -- e.g. 'Long thesis, consumer staples'
  rules_url     text,
  starts_at     timestamptz,
  ends_at       timestamptz,
  status        text not null default 'draft'
                  check (status in ('draft', 'open', 'in_progress', 'judging', 'complete', 'archived')),
  results_visible boolean not null default false,    -- host reveals when ready
  created_by    uuid references public.org_members(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists idx_pc_host on public.pitch_competitions (host_org_id);
create index if not exists idx_pc_status on public.pitch_competitions (status);

-- ── Rounds (a competition has one or more) ──
create table if not exists public.pitch_rounds (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.pitch_competitions(id) on delete cascade,
  name           text not null,                      -- 'Round 1', 'Semifinal', 'Final'
  sort_order     int not null default 0,
  starts_at      timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists idx_pr_comp on public.pitch_rounds (competition_id, sort_order);

-- ── Rooms (a round has time-slotted rooms; each has judges + teams) ──
create table if not exists public.pitch_rooms (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references public.pitch_rounds(id) on delete cascade,
  name        text not null,                         -- 'Room A', 'Zoom 3'
  location    text,                                  -- physical room or video link
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists idx_prm_round on public.pitch_rooms (round_id);

-- ── Teams (a visiting org's entry — the cross-org join) ──
create table if not exists public.pitch_teams (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.pitch_competitions(id) on delete cascade,
  org_id         uuid references public.organizations(id) on delete set null,  -- visiting school
  team_name      text not null,                      -- may differ from org name
  ticker         text,                               -- the stock they're pitching
  side           text check (side in ('long', 'short')),
  status         text not null default 'invited'
                  check (status in ('invited', 'registered', 'submitted', 'withdrawn')),
  room_id        uuid references public.pitch_rooms(id) on delete set null,
  invite_email   text,                               -- who was invited (before org links)
  created_at     timestamptz not null default now()
);
create index if not exists idx_pt_comp on public.pitch_teams (competition_id);
create index if not exists idx_pt_org on public.pitch_teams (org_id);

-- ── Team members (individual competitors on a team) ──
create table if not exists public.pitch_team_members (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.pitch_teams(id) on delete cascade,
  org_member_id uuid references public.org_members(id) on delete set null,  -- if they have an account
  full_name     text not null,
  email         text,
  role_on_team  text,                                -- 'Presenter', 'Analyst'
  created_at    timestamptz not null default now()
);
create index if not exists idx_ptm_team on public.pitch_team_members (team_id);

-- ── Judges (external bankers; magic-link access provisioned for Phase 3) ──
create table if not exists public.pitch_judges (
  id               uuid primary key default gen_random_uuid(),
  competition_id   uuid not null references public.pitch_competitions(id) on delete cascade,
  full_name        text not null,
  email            text not null,
  firm             text,                             -- 'Goldman Sachs'
  title            text,                             -- 'VP, Equity Research'
  access_token     text unique,                      -- magic-link token (Phase 3 fills/uses)
  token_expires_at timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists idx_pj_comp on public.pitch_judges (competition_id);

-- ── Judge ↔ room assignment (which judges score which room) ──
create table if not exists public.pitch_room_judges (
  room_id  uuid not null references public.pitch_rooms(id) on delete cascade,
  judge_id uuid not null references public.pitch_judges(id) on delete cascade,
  primary key (room_id, judge_id)
);

-- ── Rubric (the scoring criteria; aligns with EzanaRatingScorecard categories) ──
create table if not exists public.pitch_rubric_criteria (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.pitch_competitions(id) on delete cascade,
  label          text not null,                      -- 'Valuation rigor', 'Risk awareness'
  description    text,
  weight         numeric not null default 1,         -- relative weight in the composite
  max_score      int not null default 10,
  sort_order     int not null default 0
);
create index if not exists idx_prc_comp on public.pitch_rubric_criteria (competition_id);

-- ─────────────────────────── RLS ───────────────────────────
-- Cross-org: a competition and its structure are readable by members of the HOST
-- org OR any org that has a team in it. NOT public — these are private events.
-- Judges read via the Phase 3 magic-link path (service-role), not these policies.
-- WRITE is host executives/PMs only. App code (the API routes) re-verifies with the
-- service-role client too — RLS here is the additive backstop, per the org app's
-- defense-in-depth convention.

alter table public.pitch_competitions enable row level security;
alter table public.pitch_rounds enable row level security;
alter table public.pitch_rooms enable row level security;
alter table public.pitch_teams enable row level security;
alter table public.pitch_team_members enable row level security;
alter table public.pitch_judges enable row level security;
alter table public.pitch_room_judges enable row level security;
alter table public.pitch_rubric_criteria enable row level security;

-- Reusable membership predicates are inlined (no SQL functions) so each policy is
-- self-explanatory:
--   MY_ORGS       = org_ids where I'm an active member
--   MY_MANAGED    = org_ids where I'm an active executive/PM
--   HOST_OR_PART  = competition ids I host OR have a team in
--   HOST_MANAGED  = competition ids whose host org I manage

-- pitch_competitions
drop policy if exists "pc read host or participant" on public.pitch_competitions;
create policy "pc read host or participant" on public.pitch_competitions for select using (
  host_org_id in (select org_id from public.org_members where user_id = auth.uid() and is_active)
  or id in (
    select t.competition_id from public.pitch_teams t
    join public.org_members m on m.org_id = t.org_id
    where m.user_id = auth.uid() and m.is_active
  )
);
drop policy if exists "pc write host managers" on public.pitch_competitions;
create policy "pc write host managers" on public.pitch_competitions for all using (
  host_org_id in (
    select org_id from public.org_members
    where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active
  )
) with check (
  host_org_id in (
    select org_id from public.org_members
    where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active
  )
);

-- Helper predicate as an inline subquery reused by the child tables.
-- pitch_rounds
drop policy if exists "prd read" on public.pitch_rounds;
create policy "prd read" on public.pitch_rounds for select using (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (select org_id from public.org_members where user_id = auth.uid() and is_active)
       or c.id in (
         select t.competition_id from public.pitch_teams t
         join public.org_members m on m.org_id = t.org_id
         where m.user_id = auth.uid() and m.is_active
       )
  )
);
drop policy if exists "prd write" on public.pitch_rounds;
create policy "prd write" on public.pitch_rounds for all using (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (
      select org_id from public.org_members where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active
    )
  )
) with check (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (
      select org_id from public.org_members where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active
    )
  )
);

-- pitch_rooms (join up through the round to the competition)
drop policy if exists "prm read" on public.pitch_rooms;
create policy "prm read" on public.pitch_rooms for select using (
  round_id in (
    select r.id from public.pitch_rounds r
    join public.pitch_competitions c on c.id = r.competition_id
    where c.host_org_id in (select org_id from public.org_members where user_id = auth.uid() and is_active)
       or c.id in (
         select t.competition_id from public.pitch_teams t
         join public.org_members m on m.org_id = t.org_id
         where m.user_id = auth.uid() and m.is_active
       )
  )
);
drop policy if exists "prm write" on public.pitch_rooms;
create policy "prm write" on public.pitch_rooms for all using (
  round_id in (
    select r.id from public.pitch_rounds r
    join public.pitch_competitions c on c.id = r.competition_id
    where c.host_org_id in (
      select org_id from public.org_members where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active
    )
  )
) with check (
  round_id in (
    select r.id from public.pitch_rounds r
    join public.pitch_competitions c on c.id = r.competition_id
    where c.host_org_id in (
      select org_id from public.org_members where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active
    )
  )
);

-- pitch_teams — host sees all teams; a VISITING member sees only their own org's
-- team (this is the cross-org privacy scoping the QA checks).
drop policy if exists "pt read host or own org" on public.pitch_teams;
create policy "pt read host or own org" on public.pitch_teams for select using (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (select org_id from public.org_members where user_id = auth.uid() and is_active)
  )
  or org_id in (select org_id from public.org_members where user_id = auth.uid() and is_active)
);
drop policy if exists "pt write host managers" on public.pitch_teams;
create policy "pt write host managers" on public.pitch_teams for all using (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (
      select org_id from public.org_members where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active
    )
  )
) with check (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (
      select org_id from public.org_members where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active
    )
  )
);

-- pitch_team_members — visible with the team it belongs to (host, or the team's own org).
drop policy if exists "ptm read" on public.pitch_team_members;
create policy "ptm read" on public.pitch_team_members for select using (
  team_id in (
    select t.id from public.pitch_teams t
    join public.pitch_competitions c on c.id = t.competition_id
    where c.host_org_id in (select org_id from public.org_members where user_id = auth.uid() and is_active)
       or t.org_id in (select org_id from public.org_members where user_id = auth.uid() and is_active)
  )
);
drop policy if exists "ptm write host managers" on public.pitch_team_members;
create policy "ptm write host managers" on public.pitch_team_members for all using (
  team_id in (
    select t.id from public.pitch_teams t
    join public.pitch_competitions c on c.id = t.competition_id
    where c.host_org_id in (
      select org_id from public.org_members where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active
    )
  )
) with check (
  team_id in (
    select t.id from public.pitch_teams t
    join public.pitch_competitions c on c.id = t.competition_id
    where c.host_org_id in (
      select org_id from public.org_members where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active
    )
  )
);

-- pitch_judges — host org only (participants don't see the judge roster in Phase 1).
drop policy if exists "pj read host" on public.pitch_judges;
create policy "pj read host" on public.pitch_judges for select using (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (select org_id from public.org_members where user_id = auth.uid() and is_active)
  )
);
drop policy if exists "pj write host managers" on public.pitch_judges;
create policy "pj write host managers" on public.pitch_judges for all using (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (
      select org_id from public.org_members where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active
    )
  )
) with check (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (
      select org_id from public.org_members where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active
    )
  )
);

-- pitch_room_judges — host org only.
drop policy if exists "prj read host" on public.pitch_room_judges;
create policy "prj read host" on public.pitch_room_judges for select using (
  room_id in (
    select rm.id from public.pitch_rooms rm
    join public.pitch_rounds r on r.id = rm.round_id
    join public.pitch_competitions c on c.id = r.competition_id
    where c.host_org_id in (select org_id from public.org_members where user_id = auth.uid() and is_active)
  )
);
drop policy if exists "prj write host managers" on public.pitch_room_judges;
create policy "prj write host managers" on public.pitch_room_judges for all using (
  room_id in (
    select rm.id from public.pitch_rooms rm
    join public.pitch_rounds r on r.id = rm.round_id
    join public.pitch_competitions c on c.id = r.competition_id
    where c.host_org_id in (
      select org_id from public.org_members where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active
    )
  )
) with check (
  room_id in (
    select rm.id from public.pitch_rooms rm
    join public.pitch_rounds r on r.id = rm.round_id
    join public.pitch_competitions c on c.id = r.competition_id
    where c.host_org_id in (
      select org_id from public.org_members where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active
    )
  )
);

-- pitch_rubric_criteria — host-or-participant read, host-manager write.
drop policy if exists "prc read" on public.pitch_rubric_criteria;
create policy "prc read" on public.pitch_rubric_criteria for select using (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (select org_id from public.org_members where user_id = auth.uid() and is_active)
       or c.id in (
         select t.competition_id from public.pitch_teams t
         join public.org_members m on m.org_id = t.org_id
         where m.user_id = auth.uid() and m.is_active
       )
  )
);
drop policy if exists "prc write host managers" on public.pitch_rubric_criteria;
create policy "prc write host managers" on public.pitch_rubric_criteria for all using (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (
      select org_id from public.org_members where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active
    )
  )
) with check (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (
      select org_id from public.org_members where user_id = auth.uid() and role in ('executive', 'portfolio_manager') and is_active
    )
  )
);
