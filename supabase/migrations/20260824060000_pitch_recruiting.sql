-- Phase 7: consent-gated pitch afterlife / recruiting-signal layer. Students are
-- involved, so consent is LOAD-BEARING (PIPEDA / Law 25): default is none/private,
-- opt-in only, revocable any time, and NO path exposes a non-consenting student.
-- Judge flags are written only via the token-gated judge API (service role); firm
-- access is consent-checked at query time and never rides the account-less token
-- path.

-- A pitch becomes a shareable artifact ONLY with explicit opt-in from the member.
create table if not exists public.pitch_talent_optin (
  id uuid primary key default gen_random_uuid(),
  pitch_team_member_id uuid not null references public.pitch_team_members(id) on delete cascade,
  consented boolean not null default false,
  consent_scope text not null default 'none'
    check (consent_scope in ('judges_only', 'sponsoring_firms', 'none')),
  consented_at timestamptz,
  revoked_at   timestamptz,
  updated_at   timestamptz not null default now(),
  unique (pitch_team_member_id)
);

-- A judge flags interest in a competitor. Written ONLY via the judge token API.
-- Visible to the flagging judge; shared with the judge's firm ONLY if the student
-- consented to 'sponsoring_firms' (checked at query time by a service-role helper).
create table if not exists public.pitch_talent_flags (
  id uuid primary key default gen_random_uuid(),
  judge_id uuid not null references public.pitch_judges(id) on delete cascade,
  pitch_team_member_id uuid not null references public.pitch_team_members(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (judge_id, pitch_team_member_id)
);

-- Audit trail on consent changes (who/what/when) — required for a Law 25 surface.
create table if not exists public.pitch_consent_audit (
  id uuid primary key default gen_random_uuid(),
  pitch_team_member_id uuid not null references public.pitch_team_members(id) on delete cascade,
  action text not null,           -- 'granted' | 'revoked' | 'scope_changed'
  consent_scope text,
  actor_org_member_id uuid references public.org_members(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_pca_member on public.pitch_consent_audit (pitch_team_member_id, created_at desc);

alter table public.pitch_talent_optin enable row level security;
alter table public.pitch_talent_flags enable row level security;
alter table public.pitch_consent_audit enable row level security;

-- OPT-IN: the team's own org members read + write their team members' consent.
-- (No host access — consent is between the student and the platform. Firm access
-- is via a consent-checked service-role query, never these policies.)
drop policy if exists "team org rw optin" on public.pitch_talent_optin;
create policy "team org rw optin" on public.pitch_talent_optin for all using (
  pitch_team_member_id in (
    select tm.id from public.pitch_team_members tm
    join public.pitch_teams t on t.id = tm.team_id
    join public.org_members m on m.org_id = t.org_id
    where m.user_id = auth.uid() and m.is_active
  )
) with check (
  pitch_team_member_id in (
    select tm.id from public.pitch_team_members tm
    join public.pitch_teams t on t.id = tm.team_id
    join public.org_members m on m.org_id = t.org_id
    where m.user_id = auth.uid() and m.is_active
  )
);

-- CONSENT AUDIT: the team's org members read their members' history; inserts come
-- from the service-role opt-in API.
drop policy if exists "team org reads audit" on public.pitch_consent_audit;
create policy "team org reads audit" on public.pitch_consent_audit for select using (
  pitch_team_member_id in (
    select tm.id from public.pitch_team_members tm
    join public.pitch_teams t on t.id = tm.team_id
    join public.org_members m on m.org_id = t.org_id
    where m.user_id = auth.uid() and m.is_active
  )
);

-- FLAGS: NO anon/auth policy at all. Writes come from the judge token API and reads
-- from the consent-checked service-role recruiting query — both service-role, both
-- bypass RLS. Deny-by-default for everyone else.
