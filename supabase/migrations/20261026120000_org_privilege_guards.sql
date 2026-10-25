-- 20261026120000_org_privilege_guards.sql
-- QA audit ORG-2 / ORG-8: close privilege escalation through direct
-- (browser-key) writes on org tables. Verified against the live catalog on
-- 2026-10-25:
--   * "managers update org members" lets any executive OR portfolio_manager
--     UPDATE every column of every org_members row in their org, including
--     their own role/tier.
--   * "exec pm manage org member permissions" (FOR ALL) lets a PM grant any
--     permission to anyone, including themselves.
--   * "members update pitches in org" lets ANY active member UPDATE any pitch
--     in the org (stage, status, decision, vote counts) with no WITH CHECK.
--
-- SHIP ORDER: the API code that moves analyst-initiated pitch workflow writes
-- and PM lifecycle writes to the service-role client (QA ORG-2/ORG-8 commit)
-- must be deployed BEFORE this migration is applied.
--
-- The API routes keep working: role/tier changes run through
-- /api/org/members (executive, user client) and
-- /api/org/members/[memberId]/role (service role), both allowed below.
--
-- Changes vs. the audit draft:
--   * ez_is_service_request() keys off the SET ROLE value (the `role` GUC),
--     not current_user. The guard triggers are SECURITY DEFINER, so inside
--     them current_user is the function OWNER (postgres) and the draft's
--     `current_user in ('postgres', ...)` made every browser write look
--     privileged, turning both guards into no-ops. PostgREST does
--     `set local role authenticated|anon|service_role` per request; the SQL
--     editor, migrations and cron run with role = 'none'.
--   * Every object that touches an org table is created only when that table
--     exists (to_regclass), so the file also applies cleanly to the local
--     stub database used by `npm run test:rls`.
--   * No explicit begin/commit: the migration runner wraps each file.
-- Idempotent.

-- Helper: is the current request the service role / a direct DB session?
create or replace function public.ez_is_service_request()
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(nullif(current_setting('role', true), ''), 'none')
           not in ('authenticated', 'anon');
$$;

-- 1. org_members: privileged columns change only via service role or an executive of that org
create or replace function public.org_members_guard_privileged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_exec boolean;
begin
  if public.ez_is_service_request() then
    return new;
  end if;

  select exists (
    select 1 from public.org_members m
    where m.user_id = auth.uid() and m.is_active = true
      and m.role = 'executive' and m.org_id = old.org_id
  ) into is_exec;

  if new.org_id is distinct from old.org_id or new.user_id is distinct from old.user_id then
    raise exception 'org_members.org_id/user_id cannot be changed' using errcode = '42501';
  end if;

  if not is_exec and (
       new.role       is distinct from old.role
    or new.tier       is distinct from old.tier
    or new.sub_role   is distinct from old.sub_role
    or new.is_active  is distinct from old.is_active
    or new.can_invite is distinct from old.can_invite
  ) then
    raise exception 'Only an executive can change role, tier, activation or invite rights'
      using errcode = '42501';
  end if;

  -- Nobody, executive included, can change their own role/tier from the browser
  if old.user_id = auth.uid() and (
       new.role is distinct from old.role or new.tier is distinct from old.tier
  ) then
    raise exception 'You cannot change your own role or tier' using errcode = '42501';
  end if;

  return new;
end;
$$;

do $$
begin
  if to_regclass('public.org_members') is not null then
    execute 'drop trigger if exists org_members_guard_privileged on public.org_members';
    execute 'create trigger org_members_guard_privileged
               before update on public.org_members
               for each row execute function public.org_members_guard_privileged()';
  end if;
end
$$;

-- 2. org_member_permissions: managers may not grant/revoke their OWN permissions
do $$
begin
  if to_regclass('public.org_member_permissions') is not null
     and to_regclass('public.org_members') is not null then
    execute 'drop policy if exists "exec pm manage org member permissions" on public.org_member_permissions';
    execute $p$
      create policy "exec pm manage org member permissions"
        on public.org_member_permissions
        for all
        using (
          exists (
            select 1
            from public.org_members mgr
            join public.org_members target
              on target.org_id = mgr.org_id and target.id = org_member_permissions.org_member_id
            where mgr.user_id = auth.uid() and mgr.is_active = true
              and mgr.role in ('executive', 'portfolio_manager')
              and (mgr.role = 'executive' or target.user_id <> auth.uid())
          )
        )
        with check (
          exists (
            select 1
            from public.org_members mgr
            join public.org_members target
              on target.org_id = mgr.org_id and target.id = org_member_permissions.org_member_id
            where mgr.user_id = auth.uid() and mgr.is_active = true
              and mgr.role in ('executive', 'portfolio_manager')
              and (mgr.role = 'executive' or target.user_id <> auth.uid())
          )
        )
    $p$;
  end if;
end
$$;

-- 3. org_pitches: members may edit only their own pitch content; workflow
--    columns (stage/status/decision/votes/approver) only via service role or managers.
create or replace function public.org_pitches_guard_workflow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.ez_is_service_request() then
    return new;
  end if;
  if new.org_id in (select public.auth_manager_org_ids()) then
    return new;
  end if;
  if new.stage                  is distinct from old.stage
  or new.status                 is distinct from old.status
  or new.decision               is distinct from old.decision
  or new.decision_at            is distinct from old.decision_at
  or new.vote_yes_count         is distinct from old.vote_yes_count
  or new.vote_no_count          is distinct from old.vote_no_count
  or new.vote_abstain_count     is distinct from old.vote_abstain_count
  or new.approving_pm_member_id is distinct from old.approving_pm_member_id
  or new.org_id                 is distinct from old.org_id
  or new.analyst_member_id      is distinct from old.analyst_member_id then
    raise exception 'Pitch workflow fields change only through the pitch API' using errcode = '42501';
  end if;
  return new;
end;
$$;

do $$
begin
  if to_regclass('public.org_pitches') is not null
     and to_regclass('public.org_members') is not null then
    execute 'drop policy if exists "members update pitches in org" on public.org_pitches';
    execute $p$
      create policy "members update pitches in org"
        on public.org_pitches
        for update
        using (
          org_id in (select public.auth_manager_org_ids())
          or analyst_member_id in (
            select m.id from public.org_members m where m.user_id = auth.uid() and m.is_active = true
          )
        )
        with check (
          org_id in (select public.auth_manager_org_ids())
          or analyst_member_id in (
            select m.id from public.org_members m where m.user_id = auth.uid() and m.is_active = true
          )
        )
    $p$;

    execute 'drop trigger if exists org_pitches_guard_workflow on public.org_pitches';
    execute 'create trigger org_pitches_guard_workflow
               before update on public.org_pitches
               for each row execute function public.org_pitches_guard_workflow()';
  end if;
end
$$;

-- Verify (expect 2 triggers, 1 recreated permissions policy, 1 recreated pitch policy):
-- select tgname from pg_trigger where tgname in ('org_members_guard_privileged','org_pitches_guard_workflow');
-- select policyname, cmd, with_check is not null as has_check from pg_policies
--   where tablename in ('org_member_permissions','org_pitches') order by 1;
