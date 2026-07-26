-- Pitch competition Phase 2: configurable onboarding + team registration &
-- deliverables. Extends the Phase 1 model (pitch_competitions / pitch_teams …).
-- The host university owns its competition; only its execs/PMs edit config and
-- decide requests. Admission is a config enum so we cover the full range of real
-- council onboarding processes instead of hardcoding one workflow.

-- ── How a competition admits teams (1:1 with a competition) ──
create table if not exists public.pitch_competition_config (
  competition_id uuid primary key references public.pitch_competitions(id) on delete cascade,

  admission_mode text not null default 'invite_only'
    check (admission_mode in ('invite_only', 'open_signup', 'request_approval', 'application')),

  max_teams          int,
  max_teams_per_org  int not null default 1,
  registration_opens_at  timestamptz,
  registration_closes_at timestamptz,

  requires_ticker_at_signup boolean not null default false,
  ticker_assignment text not null default 'team_choice'
    check (ticker_assignment in ('team_choice', 'host_assigns', 'from_pool')),
  ticker_pool text[],
  side_constraint text not null default 'either'
    check (side_constraint in ('either', 'long_only', 'short_only', 'host_assigns')),

  application_requires_deck   boolean not null default false,
  application_requires_thesis boolean not null default false,
  application_prompt text,

  deliverable_deck   boolean not null default true,
  deliverable_thesis boolean not null default false,
  deliverable_model  boolean not null default false,
  deliverable_notes  text,
  deliverable_due_at timestamptz,

  eligibility_note text,
  requires_host_approval_after_signup boolean not null default false,

  updated_by uuid references public.org_members(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ── Join requests / applications (the admission workflow) ──
create table if not exists public.pitch_join_requests (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.pitch_competitions(id) on delete cascade,
  org_id         uuid references public.organizations(id) on delete set null,
  requested_by   uuid references public.org_members(id) on delete set null,
  team_name      text not null,
  contact_email  text,
  application_deck_url text,
  application_thesis   text,
  application_note     text,
  status         text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  decided_by     uuid references public.org_members(id) on delete set null,
  decided_at     timestamptz,
  decision_note  text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_pjr_comp on public.pitch_join_requests (competition_id, status);
create index if not exists idx_pjr_org on public.pitch_join_requests (org_id);

-- ── Team deliverable uploads ──
create table if not exists public.pitch_deliverables (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.pitch_teams(id) on delete cascade,
  kind        text not null check (kind in ('deck', 'thesis', 'model', 'exhibit')),
  file_path   text,
  file_name   text,
  thesis_text text,
  uploaded_by uuid references public.org_members(id) on delete set null,
  uploaded_at timestamptz not null default now()
);
create index if not exists idx_pd_team on public.pitch_deliverables (team_id, kind);

-- ─────────────────────────── RLS ───────────────────────────
alter table public.pitch_competition_config enable row level security;
alter table public.pitch_join_requests enable row level security;
alter table public.pitch_deliverables enable row level security;

-- CONFIG: host + participating orgs read; host execs/PMs write.
drop policy if exists "participants read config" on public.pitch_competition_config;
create policy "participants read config" on public.pitch_competition_config for select using (
  competition_id in (
    select id from public.pitch_competitions c
    where c.host_org_id in (select org_id from public.org_members where user_id = auth.uid() and is_active)
       or c.id in (
         select competition_id from public.pitch_teams t
         join public.org_members m on m.org_id = t.org_id
         where m.user_id = auth.uid() and m.is_active
       )
  )
);
drop policy if exists "host managers write config" on public.pitch_competition_config;
create policy "host managers write config" on public.pitch_competition_config for all using (
  competition_id in (
    select c.id from public.pitch_competitions c
    join public.org_members m on m.org_id = c.host_org_id
    where m.user_id = auth.uid() and m.role in ('executive', 'portfolio_manager') and m.is_active
  )
) with check (
  competition_id in (
    select c.id from public.pitch_competitions c
    join public.org_members m on m.org_id = c.host_org_id
    where m.user_id = auth.uid() and m.role in ('executive', 'portfolio_manager') and m.is_active
  )
);

-- JOIN REQUESTS: requesting org reads its own; host managers read all + decide.
drop policy if exists "org creates and reads own request" on public.pitch_join_requests;
create policy "org creates and reads own request" on public.pitch_join_requests for select using (
  org_id in (select org_id from public.org_members where user_id = auth.uid() and is_active)
  or competition_id in (
    select c.id from public.pitch_competitions c
    join public.org_members m on m.org_id = c.host_org_id
    where m.user_id = auth.uid() and m.role in ('executive', 'portfolio_manager') and m.is_active
  )
);
drop policy if exists "org inserts own request" on public.pitch_join_requests;
create policy "org inserts own request" on public.pitch_join_requests for insert with check (
  org_id in (select org_id from public.org_members where user_id = auth.uid() and is_active)
);
drop policy if exists "host managers decide requests" on public.pitch_join_requests;
create policy "host managers decide requests" on public.pitch_join_requests for update using (
  competition_id in (
    select c.id from public.pitch_competitions c
    join public.org_members m on m.org_id = c.host_org_id
    where m.user_id = auth.uid() and m.role in ('executive', 'portfolio_manager') and m.is_active
  )
);

-- DELIVERABLES: team's own org members read/write; host managers read all.
drop policy if exists "team org rw own deliverables" on public.pitch_deliverables;
create policy "team org rw own deliverables" on public.pitch_deliverables for all using (
  team_id in (
    select t.id from public.pitch_teams t
    join public.org_members m on m.org_id = t.org_id
    where m.user_id = auth.uid() and m.is_active
  )
) with check (
  team_id in (
    select t.id from public.pitch_teams t
    join public.org_members m on m.org_id = t.org_id
    where m.user_id = auth.uid() and m.is_active
  )
);
drop policy if exists "host managers read deliverables" on public.pitch_deliverables;
create policy "host managers read deliverables" on public.pitch_deliverables for select using (
  team_id in (
    select t.id from public.pitch_teams t
    join public.pitch_competitions c on c.id = t.competition_id
    join public.org_members m on m.org_id = c.host_org_id
    where m.user_id = auth.uid() and m.role in ('executive', 'portfolio_manager') and m.is_active
  )
);

-- ── Storage: private 'pitch-deliverables' bucket, path {competition_id}/{team_id}/…
--    Mirrors the avatars pattern (folder-scoped storage.objects policies). ──
insert into storage.buckets (id, name, public)
values ('pitch-deliverables', 'pitch-deliverables', false)
on conflict (id) do nothing;

drop policy if exists "team org rw deliverable files" on storage.objects;
create policy "team org rw deliverable files" on storage.objects for all using (
  bucket_id = 'pitch-deliverables'
  and (storage.foldername(name))[2]::uuid in (
    select t.id from public.pitch_teams t
    join public.org_members m on m.org_id = t.org_id
    where m.user_id = auth.uid() and m.is_active
  )
) with check (
  bucket_id = 'pitch-deliverables'
  and (storage.foldername(name))[2]::uuid in (
    select t.id from public.pitch_teams t
    join public.org_members m on m.org_id = t.org_id
    where m.user_id = auth.uid() and m.is_active
  )
);
drop policy if exists "host managers read deliverable files" on storage.objects;
create policy "host managers read deliverable files" on storage.objects for select using (
  bucket_id = 'pitch-deliverables'
  and (storage.foldername(name))[2]::uuid in (
    select t.id from public.pitch_teams t
    join public.pitch_competitions c on c.id = t.competition_id
    join public.org_members m on m.org_id = c.host_org_id
    where m.user_id = auth.uid() and m.role in ('executive', 'portfolio_manager') and m.is_active
  )
);
