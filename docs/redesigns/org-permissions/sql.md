# Team Permissions: narrow the stored-grants rule (not run)

Written 2026-11-16 for branch `redesign/org-permissions`. Nothing below has been run. Paste it into the Supabase SQL editor after the branch is merged.

## Why

Today the write rule on `public.org_member_permissions` is the policy `"exec pm manage org member permissions"` (FOR ALL, last set in `20261026120000_org_privilege_guards.sql`). It lets any active executive or portfolio manager read and write grants for ANY member of their council, for ANY permission key, and lets an executive grant to themselves. Only portfolio managers are stopped from changing their own rows. The page's server step (now `checkGrantChange` / `decideChange`) is much narrower, but anyone calling the database directly with their own session is held only by this policy.

The new rule matches the page exactly:

- reads: a member sees their own grants (existing policy, unchanged) and the grants of their own active direct reports in the org chart;
- writes: only for an active direct report (target `reports_to` is the caller's active membership in the same council), never the caller themselves, only the eight page rights, only when the caller's ROLE can grant (executive, Senior PM, PM; a stored extra never counts), and a grant (insert, or the update half of an upsert) only for a right the caller holds (executives hold all eight; others by role default or by their own stored extra), with `granted_by` set to the caller's own membership;
- a revoke (delete) of any of the eight on a direct report, whoever granted it.

Not repeated in SQL (harmless rows, refused by the route): "already a role default" and "needs a manager role".

## Will legitimate grants still work?

Yes, with no route change. The route writes as the signed-in member with the same user client: `upsert({ org_member_id, permission_key, granted_by: viewer.id }, { onConflict: 'org_member_id,permission_key' })` and `delete().eq(...)`. `viewer.id` is the grantor's membership row, which is exactly the target's `reports_to`, so `auth_can_grant_right` passes for every change `decideChange` allows. The upsert's conflict path needs the UPDATE and SELECT policies, both included. Every check that needs other rows runs inside SECURITY DEFINER helpers, so the policy never queries `org_member_permissions` under RLS (no recursion).

The role-default table inside `org_member_default_rights` mirrors `PERMISSION_TIERS` in `src/lib/org-permissions-config.js` plus `manage_positions` for executives and portfolio managers (`src/lib/orgPermissionsExtended.js`). If either file changes, change this function too. The sub-role fallback (unknown sub-role: the tier's sub-role, else PM or Analyst) matches `defaultSubRole`. The `tier` column is read through `to_jsonb(m)->>'tier'` so the function works whether or not that column exists.

Other readers are unaffected: every other route reads only the caller's own rows (`members read own permission overrides`), and the holdings checks read with the service role.

## SQL

```sql
-- 1. Role defaults among the eight page rights, plus grant_permissions.
create or replace function public.org_member_default_rights(p_role text, p_sub_role text, p_tier text)
returns text[]
language sql
immutable
set search_path = public
as $$
  with sub as (
    select case
      when p_role = 'portfolio_manager' then
        case
          when p_sub_role in ('Senior PM', 'PM', 'Junior PM') then p_sub_role
          when p_tier = 'senior_portfolio_manager' then 'Senior PM'
          when p_tier = 'junior_portfolio_manager' then 'Junior PM'
          else 'PM'
        end
      when p_role = 'analyst' then
        case
          when p_sub_role in ('Senior Analyst', 'Analyst', 'Junior Analyst', 'Quantitative Analyst') then p_sub_role
          when p_tier = 'senior_analyst' then 'Senior Analyst'
          when p_tier = 'junior_analyst' then 'Junior Analyst'
          when p_tier = 'quant_analyst' then 'Quantitative Analyst'
          else 'Analyst'
        end
      else null
    end as s
  )
  select case
    when p_role = 'executive' then array['flag_positions','manage_positions','upload_deliverables','view_analytics','create_events','send_to_team','grant_permissions']
    when p_role = 'portfolio_manager' then case (select s from sub)
      when 'Senior PM' then array['flag_positions','manage_positions','upload_deliverables','view_team_analytics','create_events','approve_deliverables','send_to_team','grant_permissions']
      when 'PM' then array['flag_positions','manage_positions','upload_deliverables','view_team_analytics','send_to_team','grant_permissions']
      else array['flag_positions','manage_positions','upload_deliverables','view_team_analytics','send_to_team']
    end
    when p_role = 'analyst' then case (select s from sub)
      when 'Senior Analyst' then array['flag_positions','upload_deliverables','view_team_analytics','send_to_team']
      when 'Junior Analyst' then array['upload_deliverables']
      else array['upload_deliverables','view_team_analytics','send_to_team']
    end
    else array[]::text[]
  end;
$$;

-- 2. Does this member hold the right (executives: all eight)?
create or replace function public.org_member_holds_right(p_member_id uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.org_members m
     where m.id = p_member_id and m.is_active = true
       and (
         (m.role = 'executive' and p_key in ('flag_positions','manage_positions','upload_deliverables','view_team_analytics','view_analytics','create_events','approve_deliverables','send_to_team'))
         or p_key = any (public.org_member_default_rights(m.role, m.sub_role, to_jsonb(m)->>'tier'))
         or exists (select 1 from public.org_member_permissions p
                     where p.org_member_id = m.id and p.permission_key = p_key)
       )
  );
$$;

-- 3. Active direct reports of the caller (same council, never the caller).
create or replace function public.auth_direct_report_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select t.id
    from public.org_members t
    join public.org_members mgr on mgr.id = t.reports_to and mgr.org_id = t.org_id
   where mgr.user_id = auth.uid() and mgr.is_active = true
     and t.is_active = true and t.id <> mgr.id
     and t.user_id is distinct from auth.uid();
$$;

-- 4. May the caller revoke p_key from p_target? (direct report, role can grant, one of the eight)
create or replace function public.auth_can_revoke_right(p_target uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_key in ('flag_positions','manage_positions','upload_deliverables','view_team_analytics','view_analytics','create_events','approve_deliverables','send_to_team')
     and exists (
       select 1
         from public.org_members t
         join public.org_members mgr on mgr.id = t.reports_to and mgr.org_id = t.org_id
        where t.id = p_target and t.is_active = true and t.id <> mgr.id
          and t.user_id is distinct from auth.uid()
          and mgr.user_id = auth.uid() and mgr.is_active = true
          and 'grant_permissions' = any (public.org_member_default_rights(mgr.role, mgr.sub_role, to_jsonb(mgr)->>'tier'))
     );
$$;

-- 5. May the caller grant p_key to p_target, recorded as granted by p_granted_by?
create or replace function public.auth_can_grant_right(p_target uuid, p_key text, p_granted_by uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_can_revoke_right(p_target, p_key)
     and exists (
       select 1 from public.org_members t
        where t.id = p_target and t.reports_to = p_granted_by
     )
     and public.org_member_holds_right(p_granted_by, p_key);
$$;

revoke all on function public.org_member_default_rights(text, text, text) from public;
revoke all on function public.org_member_holds_right(uuid, text) from public;
revoke all on function public.auth_direct_report_ids() from public;
revoke all on function public.auth_can_revoke_right(uuid, text) from public;
revoke all on function public.auth_can_grant_right(uuid, text, uuid) from public;
grant execute on function public.org_member_default_rights(text, text, text) to authenticated;
grant execute on function public.org_member_holds_right(uuid, text) to authenticated;
grant execute on function public.auth_direct_report_ids() to authenticated;
grant execute on function public.auth_can_revoke_right(uuid, text) to authenticated;
grant execute on function public.auth_can_grant_right(uuid, text, uuid) to authenticated;

-- 6. Replace the wide FOR ALL policy with one per command.
drop policy if exists "exec pm manage org member permissions" on public.org_member_permissions;

drop policy if exists "supervisors read direct report permissions" on public.org_member_permissions;
create policy "supervisors read direct report permissions"
  on public.org_member_permissions for select
  using (org_member_id in (select public.auth_direct_report_ids()));

drop policy if exists "grantors add direct report permissions" on public.org_member_permissions;
create policy "grantors add direct report permissions"
  on public.org_member_permissions for insert
  with check (public.auth_can_grant_right(org_member_id, permission_key, granted_by));

drop policy if exists "grantors update direct report permissions" on public.org_member_permissions;
create policy "grantors update direct report permissions"
  on public.org_member_permissions for update
  using (public.auth_can_revoke_right(org_member_id, permission_key))
  with check (public.auth_can_grant_right(org_member_id, permission_key, granted_by));

drop policy if exists "grantors revoke direct report permissions" on public.org_member_permissions;
create policy "grantors revoke direct report permissions"
  on public.org_member_permissions for delete
  using (public.auth_can_revoke_right(org_member_id, permission_key));

-- "members read own permission overrides" (SELECT, own rows) stays as it is.
```

## Verify

```sql
select policyname, cmd from pg_policies where tablename = 'org_member_permissions' order by 1;
-- expect: grantors add / revoke / update direct report permissions, members read own permission overrides,
--         supervisors read direct report permissions (and no "exec pm manage org member permissions")
```

Then, signed in as a portfolio manager with an analyst reporting to them: grant Manage positions on the page (works), and try View fund analytics through the API (refused by the route with 403; a direct insert is refused by the database with 42501). As an executive, a direct insert for your own membership is refused.

## Before applying

- Check the live policy name on `org_member_permissions` first; the repo and production may differ.
- Existing stored rows that break the new rule (grants to non-reports, self-grants, unknown keys) are not deleted. They stay readable to their owner and keep working in the server checks until revoked by the member's current manager or removed by an executive in SQL. Find them with:

```sql
select p.*, t.reports_to, t.org_id
  from public.org_member_permissions p
  join public.org_members t on t.id = p.org_member_id
 where p.permission_key not in ('flag_positions','manage_positions','upload_deliverables','view_team_analytics','view_analytics','create_events','approve_deliverables','send_to_team')
    or p.granted_by is distinct from t.reports_to;
```
