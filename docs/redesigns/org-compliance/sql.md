# Compliance redesign: optional SQL (resolution reason, resolver, time)

Paste into the Supabase SQL editor. Not run by the build agent. Safe to run twice.

What it does: adds three nullable columns to `org_ips_violations` so a resolved
breach can keep who resolved it, when and why, plus a trigger that stamps the
resolver and time from the session (so a direct client call cannot claim
someone else resolved it). No new table and no policy change: the existing
"managers resolve violations" policy (executives and portfolio managers of the
council) already governs UPDATE, and "members read violations" governs SELECT.

Until this runs, the page detects the columns are missing (a head-only probe in
`src/app/api/org/ips/violations/_loader.js`), hides the reason field, says a
reason cannot be stored yet, and shows "Not recorded" on resolved rows.
After it runs, Resolve asks for a required reason (max 500 characters) and the
Resolved tab shows date, resolver and reason. Nothing else needs deploying.

Rule changes and resolutions are written to the existing `org_audit_log`
(actions `ips_rule_added`, `ips_rule_enabled`, `ips_rule_disabled`,
`ips_rule_deleted`, `ips_breach_resolved`, `ips_breach_reopened`) through the
same service-role `logOrgAction` path other org routes use. That needs no SQL.

```sql
alter table public.org_ips_violations
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references auth.users(id) on delete set null,
  add column if not exists resolution_reason text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'org_ips_violations_resolution_reason_len'
  ) then
    alter table public.org_ips_violations
      add constraint org_ips_violations_resolution_reason_len
      check (resolution_reason is null or char_length(resolution_reason) <= 500);
  end if;
end $$;

create or replace function public.org_ips_violations_stamp_resolution()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.resolved is true and coalesce(old.resolved, false) is false then
    new.resolved_at := now();
    new.resolved_by := coalesce(auth.uid(), new.resolved_by);
  elsif new.resolved is false then
    new.resolved_at := null;
    new.resolved_by := null;
    new.resolution_reason := null;
  else
    -- Already resolved: keep the original stamp.
    new.resolved_at := old.resolved_at;
    new.resolved_by := old.resolved_by;
  end if;
  return new;
end;
$$;

drop trigger if exists org_ips_violations_stamp_resolution on public.org_ips_violations;
create trigger org_ips_violations_stamp_resolution
  before update of resolved, resolved_at, resolved_by, resolution_reason
  on public.org_ips_violations
  for each row execute function public.org_ips_violations_stamp_resolution();

create index if not exists idx_ips_violations_resolved_at
  on public.org_ips_violations (org_id, resolved_at desc)
  where resolved = true;

notify pgrst, 'reload schema';
```

Checks after applying:

```sql
select column_name, is_nullable from information_schema.columns
where table_schema = 'public' and table_name = 'org_ips_violations'
  and column_name in ('resolved_at', 'resolved_by', 'resolution_reason');
```

Notes for the orchestrator: the RLS policies on `org_ips_violations` were
rewritten in `20260727000000_fix_org_rls_recursion.sql`; this SQL does not
touch them, so the helper functions (`auth_org_ids`, `auth_manager_org_ids`)
are not needed here. For `supabase/migrations`, wrap the file in a
`to_regclass('public.org_ips_violations') is not null` guard as usual.
