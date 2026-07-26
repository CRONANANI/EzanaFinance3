-- Phase 6: a shareable public competition page (B2B top-of-funnel), sponsors, and
-- host announcements. Only competitions the host explicitly opts public are
-- publicly readable, and only their marketing fields — the app always selects an
-- explicit safe column list for the public route (never tokens/notes).

alter table public.pitch_competitions
  add column if not exists is_public boolean not null default false,
  add column if not exists public_blurb text,
  add column if not exists banner_path text;

-- Public read of public competitions (the existing host/participant policies still
-- govern private ones; this is additive and only matches is_public rows).
drop policy if exists "public reads public competitions" on public.pitch_competitions;
create policy "public reads public competitions" on public.pitch_competitions for select using (is_public = true);

-- Sponsors: shown on the public page + results. Public-read when the competition
-- is public; host execs/PMs write.
create table if not exists public.pitch_sponsors (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.pitch_competitions(id) on delete cascade,
  name           text not null,
  logo_path      text,
  url            text,
  tier           text,
  sort_order     int not null default 0
);
create index if not exists idx_psp_comp on public.pitch_sponsors (competition_id, sort_order);

alter table public.pitch_sponsors enable row level security;
drop policy if exists "public reads sponsors of public competitions" on public.pitch_sponsors;
create policy "public reads sponsors of public competitions" on public.pitch_sponsors for select using (
  competition_id in (select id from public.pitch_competitions where is_public = true)
  or competition_id in (
    select c.id from public.pitch_competitions c
    where c.host_org_id in (select org_id from public.org_members where user_id = auth.uid() and is_active)
  )
);
drop policy if exists "host managers write sponsors" on public.pitch_sponsors;
create policy "host managers write sponsors" on public.pitch_sponsors for all using (
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

-- Announcements: host managers post; read by host + any org with a team in the
-- competition (a self-contained table since the org notification infra targets
-- within-org, not "all orgs with a team in competition X").
create table if not exists public.pitch_announcements (
  id             uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.pitch_competitions(id) on delete cascade,
  title          text not null,
  body           text,
  posted_by      uuid references public.org_members(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists idx_pann_comp on public.pitch_announcements (competition_id, created_at desc);

alter table public.pitch_announcements enable row level security;
drop policy if exists "host or participant reads announcements" on public.pitch_announcements;
create policy "host or participant reads announcements" on public.pitch_announcements for select using (
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
drop policy if exists "host managers write announcements" on public.pitch_announcements;
create policy "host managers write announcements" on public.pitch_announcements for all using (
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
