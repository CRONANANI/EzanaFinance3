-- Build 1: competition trophies. A durable award earned from a competition result,
-- shown on a member's org profile. Distinct from ELO (a rating) — a visible badge.
-- competition_name / host_org_name are DENORMALIZED so a trophy survives if the
-- competition is later archived or deleted. Awards are service-role only (the award
-- action), never user-writable — no self-awarding.

create table if not exists public.org_competition_badges (
  id               uuid primary key default gen_random_uuid(),
  org_member_id    uuid not null references public.org_members(id) on delete cascade,
  competition_id   uuid references public.pitch_competitions(id) on delete set null,
  team_id          uuid references public.pitch_teams(id) on delete set null,
  badge_key        text not null,          -- 'winner' | 'top3' | 'finalist' | 'participant' | 'best_thesis'
  placement        int,
  role_at_event    text,                   -- 'analyst' | 'presenter' | 'portfolio_manager'
  competition_name text not null,
  host_org_name    text,
  awarded_at       timestamptz not null default now(),
  unique (org_member_id, competition_id, badge_key)
);
create index if not exists idx_ocb_member on public.org_competition_badges (org_member_id, awarded_at desc);

alter table public.org_competition_badges enable row level security;
-- Read: members of the same org see each other's competition badges. Write: none
-- for anon/auth — the award action uses the service-role client.
drop policy if exists "org members read competition badges" on public.org_competition_badges;
create policy "org members read competition badges" on public.org_competition_badges for select using (
  org_member_id in (
    select om.id from public.org_members om
    join public.org_members me on me.org_id = om.org_id
    where me.user_id = auth.uid() and me.is_active
  )
);
