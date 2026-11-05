-- Sonar for organizations, part 1 (Nov 2026): research reports.
--
-- A research run an org member keeps becomes an org research report: its
-- own object, versioned and frozen, shared by visibility, reviewed and
-- approved, linked to a pitch and to Research Library collections.
--
--   1. sonar_research_runs.org_id and .snapshot: an org member's run keeps
--      the exact state the analyst saw, so a report is saved from the run
--      itself (server-side) and can never carry findings Sonar did not
--      produce.
--   2. org_sonar_reports: the report (author, desk, kind, visibility,
--      status, current and approved version, pitch, challenge of).
--   3. org_sonar_report_versions: one frozen snapshot per save. No update
--      or delete policy, and a trigger refuses updates.
--   4. org_sonar_report_comments: comments on the report or on one finding.
--   5. org_research_collections.report_ids: reports filed in a collection.
--
-- Visibility: private, members (shared_with), team (the author's desk),
-- executives (executives and portfolio managers), org. Executives and
-- portfolio managers also read any report that has been submitted.
-- The status rules (src/lib/org-sonar/reports.js canTransition) are enforced
-- by org_sonar_reports_guard: only the author submits; approval needs an
-- executive, a portfolio manager or the approve_deliverables permission, and
-- never the author.
--
-- Additive and idempotent.
--
-- Guarded with to_regclass (the 20261026120000_org_privilege_guards convention), so the
-- file also applies cleanly to the local reliability harness, which has no org tables;
-- on the live database every table exists and the whole file runs.

do $migration$
begin
  if to_regclass('public.organizations') is null
     or to_regclass('public.org_members') is null
     or to_regclass('public.org_teams') is null
     or to_regclass('public.org_pitches') is null
     or to_regclass('public.org_member_permissions') is null
     or to_regclass('public.org_research_collections') is null
     or to_regclass('public.sonar_research_runs') is null then
    raise notice 'org_sonar_reports: the tables it builds on are not present here; skipped.';
    return;
  end if;
  execute $sql$
alter table if exists public.sonar_research_runs
  add column if not exists org_id uuid references public.organizations(id) on delete set null,
  add column if not exists snapshot jsonb;
create index if not exists sonar_research_runs_org_idx
  on public.sonar_research_runs (org_id, created_at desc) where org_id is not null;

create table if not exists public.org_sonar_reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_member_id uuid references public.org_members(id) on delete set null,
  team_id uuid references public.org_teams(id) on delete set null,
  kind text not null default 'research' check (kind in ('research', 'fund_fit', 'challenge')),
  title text not null check (char_length(title) between 1 and 160),
  question text,
  ticker text,
  sector text,
  visibility text not null default 'private'
    check (visibility in ('private', 'members', 'team', 'executives', 'org')),
  shared_with uuid[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'under_review', 'approved', 'superseded')),
  current_version integer not null default 1 check (current_version >= 1),
  approved_version integer,
  summary jsonb not null default '{}'::jsonb,
  pitch_id uuid references public.org_pitches(id) on delete set null,
  challenge_of uuid references public.org_sonar_reports(id) on delete set null,
  submitted_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 2000),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists org_sonar_reports_org_idx on public.org_sonar_reports (org_id, updated_at desc);
create index if not exists org_sonar_reports_pitch_idx on public.org_sonar_reports (pitch_id) where pitch_id is not null;
create index if not exists org_sonar_reports_challenge_idx on public.org_sonar_reports (challenge_of) where challenge_of is not null;
create index if not exists org_sonar_reports_ticker_idx on public.org_sonar_reports (org_id, ticker);
create index if not exists org_sonar_reports_author_idx on public.org_sonar_reports (org_id, author_id);

create table if not exists public.org_sonar_report_versions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.org_sonar_reports(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  version integer not null,
  run_id uuid,
  snapshot jsonb not null,
  summary jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (report_id, version)
);

create table if not exists public.org_sonar_report_comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.org_sonar_reports(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  version integer,
  anchor text not null default 'report' check (anchor ~ '^[A-Za-z0-9_:-]{1,80}$'),
  body text not null check (char_length(body) between 1 and 4000),
  parent_id uuid references public.org_sonar_report_comments(id) on delete cascade,
  resolved boolean not null default false,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists org_sonar_report_comments_report_idx
  on public.org_sonar_report_comments (report_id, created_at);

alter table if exists public.org_research_collections
  add column if not exists report_ids uuid[] not null default '{}';

-- Who may review (approve or return) a report in an org.
create or replace function public.org_sonar_is_reviewer(p_org uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members m
     where m.user_id = auth.uid() and m.org_id = p_org and m.is_active = true
       and (m.role in ('executive', 'portfolio_manager')
            or exists (select 1 from public.org_member_permissions p
                        where p.org_member_id = m.id
                          and p.permission_key = 'approve_deliverables'))
  );
$$;

-- Mirrors canReadReport() in src/lib/org-sonar/reports.js.
create or replace function public.org_sonar_report_visible(
  p_org uuid, p_author uuid, p_visibility text, p_team uuid, p_shared uuid[], p_status text
)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members m
     where m.user_id = auth.uid() and m.org_id = p_org and m.is_active = true
       and (p_author = auth.uid()
            or (m.role in ('executive', 'portfolio_manager') and p_status <> 'draft')
            or p_visibility = 'org'
            or (p_visibility = 'team' and p_team is not null and m.team_id = p_team)
            or (p_visibility = 'executives' and m.role in ('executive', 'portfolio_manager'))
            or (p_visibility = 'members' and auth.uid() = any (p_shared)))
  );
$$;

create or replace function public.org_sonar_report_readable(p_report uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((
    select public.org_sonar_report_visible(r.org_id, r.author_id, r.visibility, r.team_id,
                                           r.shared_with, r.status)
      from public.org_sonar_reports r where r.id = p_report
  ), false);
$$;

-- Status rules, immutable ownership, review fields set only by transitions.
create or replace function public.org_sonar_reports_guard()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_reviewer boolean;
begin
  if new.org_id <> old.org_id or new.author_id <> old.author_id or new.kind <> old.kind then
    raise exception 'A report''s author, organization and kind cannot change' using errcode = '42501';
  end if;
  if new.current_version < old.current_version then
    raise exception 'A report''s version cannot go back' using errcode = '42501';
  end if;
  new.updated_at := now();
  if v_uid is null then
    return new; -- service role (maintenance)
  end if;
  if new.status is distinct from old.status then
    v_reviewer := public.org_sonar_is_reviewer(new.org_id);
    if new.status = 'under_review' then
      if old.status <> 'draft' or v_uid <> old.author_id then
        raise exception 'Only the author submits a draft for review' using errcode = '42501';
      end if;
      new.submitted_at := now();
    elsif new.status = 'approved' then
      if old.status <> 'under_review' or not v_reviewer or v_uid = old.author_id then
        raise exception 'A report under review is approved by a reviewer other than its author'
          using errcode = '42501';
      end if;
      new.reviewed_by := v_uid;
      new.reviewed_at := now();
      new.approved_at := now();
      new.approved_version := new.current_version;
    elsif new.status = 'draft' then
      if old.status = 'under_review' then
        if not (v_uid = old.author_id or v_reviewer) then
          raise exception 'Only the author or a reviewer returns a report' using errcode = '42501';
        end if;
        if v_uid <> old.author_id then
          new.reviewed_by := v_uid;
          new.reviewed_at := now();
        end if;
      elsif old.status = 'approved' then
        -- a new version of an approved report goes back to draft
        if not (new.current_version > old.current_version
                and (v_uid = old.author_id or v_reviewer)) then
          raise exception 'An approved report returns to draft only with a new version'
            using errcode = '42501';
        end if;
      else
        raise exception 'That status change is not allowed' using errcode = '42501';
      end if;
    elsif new.status = 'superseded' then
      if old.status <> 'approved' or not (v_uid = old.author_id or v_reviewer) then
        raise exception 'Only an approved report is superseded' using errcode = '42501';
      end if;
    end if;
  end if;
  if new.status = old.status then
    new.approved_version := old.approved_version;
    new.approved_at := old.approved_at;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.submitted_at := old.submitted_at;
  end if;
  if new.status = 'draft' and old.status = 'approved' then
    new.approved_version := old.approved_version;
    new.approved_at := old.approved_at;
  end if;
  return new;
end;
$$;
drop trigger if exists org_sonar_reports_guard on public.org_sonar_reports;
create trigger org_sonar_reports_guard
  before update on public.org_sonar_reports
  for each row execute function public.org_sonar_reports_guard();

-- A version takes its report's organization and the next number, and is
-- never changed afterwards.
create or replace function public.org_sonar_versions_fill()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  select r.org_id into new.org_id from public.org_sonar_reports r where r.id = new.report_id;
  if new.org_id is null then
    raise exception 'Unknown report' using errcode = '23503';
  end if;
  new.version := coalesce(
    (select max(v.version) from public.org_sonar_report_versions v where v.report_id = new.report_id),
    0) + 1;
  new.created_at := now();
  return new;
end;
$$;
drop trigger if exists org_sonar_versions_fill on public.org_sonar_report_versions;
create trigger org_sonar_versions_fill
  before insert on public.org_sonar_report_versions
  for each row execute function public.org_sonar_versions_fill();

create or replace function public.org_sonar_versions_frozen()
returns trigger
language plpgsql
as $$
begin
  raise exception 'A saved report version cannot be changed' using errcode = '42501';
end;
$$;
drop trigger if exists org_sonar_versions_frozen on public.org_sonar_report_versions;
create trigger org_sonar_versions_frozen
  before update on public.org_sonar_report_versions
  for each row execute function public.org_sonar_versions_frozen();

-- A comment takes its report's organization; a reply stays on its report.
create or replace function public.org_sonar_comments_fill()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  select r.org_id into new.org_id from public.org_sonar_reports r where r.id = new.report_id;
  if new.org_id is null then
    raise exception 'Unknown report' using errcode = '23503';
  end if;
  if new.parent_id is not null and not exists (
    select 1 from public.org_sonar_report_comments c
     where c.id = new.parent_id and c.report_id = new.report_id
  ) then
    raise exception 'A reply belongs to the same report' using errcode = '23503';
  end if;
  if tg_op = 'UPDATE' then
    new.body := old.body;
    new.author_id := old.author_id;
    new.report_id := old.report_id;
    new.anchor := old.anchor;
    new.created_at := old.created_at;
    if new.resolved and not old.resolved then
      new.resolved_by := auth.uid();
      new.resolved_at := now();
    elsif not new.resolved then
      new.resolved_by := null;
      new.resolved_at := null;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists org_sonar_comments_fill on public.org_sonar_report_comments;
create trigger org_sonar_comments_fill
  before insert or update on public.org_sonar_report_comments
  for each row execute function public.org_sonar_comments_fill();

alter table public.org_sonar_reports enable row level security;
alter table public.org_sonar_report_versions enable row level security;
alter table public.org_sonar_report_comments enable row level security;

drop policy if exists org_sonar_reports_read on public.org_sonar_reports;
create policy org_sonar_reports_read on public.org_sonar_reports
  for select to authenticated
  using (public.org_sonar_report_visible(org_id, author_id, visibility, team_id, shared_with, status));

drop policy if exists org_sonar_reports_insert on public.org_sonar_reports;
create policy org_sonar_reports_insert on public.org_sonar_reports
  for insert to authenticated
  with check (author_id = auth.uid() and status = 'draft'
              and org_id in (select public.auth_org_ids()));

drop policy if exists org_sonar_reports_update on public.org_sonar_reports;
create policy org_sonar_reports_update on public.org_sonar_reports
  for update to authenticated
  using ((author_id = auth.uid() or public.org_sonar_is_reviewer(org_id))
         and org_id in (select public.auth_org_ids()))
  with check (org_id in (select public.auth_org_ids()));

drop policy if exists org_sonar_reports_delete on public.org_sonar_reports;
create policy org_sonar_reports_delete on public.org_sonar_reports
  for delete to authenticated
  using (author_id = auth.uid() and status = 'draft');

drop policy if exists org_sonar_versions_read on public.org_sonar_report_versions;
create policy org_sonar_versions_read on public.org_sonar_report_versions
  for select to authenticated
  using (public.org_sonar_report_readable(report_id));

drop policy if exists org_sonar_versions_insert on public.org_sonar_report_versions;
create policy org_sonar_versions_insert on public.org_sonar_report_versions
  for insert to authenticated
  with check (created_by = auth.uid() and exists (
    select 1 from public.org_sonar_reports r
     where r.id = report_id
       and r.org_id in (select public.auth_org_ids())
       and (r.author_id = auth.uid() or public.org_sonar_is_reviewer(r.org_id))
  ));

drop policy if exists org_sonar_comments_read on public.org_sonar_report_comments;
create policy org_sonar_comments_read on public.org_sonar_report_comments
  for select to authenticated
  using (public.org_sonar_report_readable(report_id));

drop policy if exists org_sonar_comments_insert on public.org_sonar_report_comments;
create policy org_sonar_comments_insert on public.org_sonar_report_comments
  for insert to authenticated
  with check (author_id = auth.uid() and public.org_sonar_report_readable(report_id));

drop policy if exists org_sonar_comments_update on public.org_sonar_report_comments;
create policy org_sonar_comments_update on public.org_sonar_report_comments
  for update to authenticated
  using (public.org_sonar_report_readable(report_id)
         and (author_id = auth.uid() or public.org_sonar_is_reviewer(org_id)
              or exists (select 1 from public.org_sonar_reports r
                          where r.id = report_id and r.author_id = auth.uid())));

drop policy if exists org_sonar_comments_delete on public.org_sonar_report_comments;
create policy org_sonar_comments_delete on public.org_sonar_report_comments
  for delete to authenticated
  using (author_id = auth.uid());

revoke all on function public.org_sonar_reports_guard() from public, anon, authenticated;
revoke all on function public.org_sonar_versions_fill() from public, anon, authenticated;
revoke all on function public.org_sonar_comments_fill() from public, anon, authenticated;
  $sql$;
end;
$migration$;
